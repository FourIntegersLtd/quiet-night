import ExpoModulesCore
import SoundAnalysis
import AVFoundation
import CoreML
import Accelerate
import CoreMedia

public class ExpoSnoreDetectorModule: Module {
    private var audioEngine = AVAudioEngine()
    private var streamAnalyzer: SNAudioStreamAnalyzer?
    private var resultsObserver: SnoreObserver?
    
    /// Current room noise level in dBFS (decibels relative to full scale). Updated every buffer in the tap.
    private var currentNoiseLevelDB: Float = -160.0
    
    // --- Continuous Recording State ---
    var isCurrentlyWritingSnore = false
    var currentAudioFile: AVAudioFile?
    var currentFileURL: URL?
    
    // We keep a small rolling buffer just to catch the 1 second *before* the snore started
    var preSnoreBuffer: [AVAudioPCMBuffer] = []
    
    /// Latest "Snoring" classification confidence for the current clip (sent when we stop recording).
    var lastSnoringConfidence: Float = 0.99
    
    /// Gain applied when writing snore clips so playback is audible (phone is often far from user).
    private let snoreRecordingGain: Float = 2.5
    
    public func definition() -> ModuleDefinition {
        Name("ExpoSnoreDetector")
        Events("onSnoreDetected")

        Function("getCurrentNoiseLevel") { () -> Float in
            return self.currentNoiseLevelDB
        }

        AsyncFunction("startListening") { () -> Void in
            self.cleanupOldSnoreFiles()
            self.preSnoreBuffer.removeAll()
            self.isCurrentlyWritingSnore = false
            
            do {
                let audioSession = AVAudioSession.sharedInstance()
                try audioSession.setCategory(.record, mode: .measurement, options: [.duckOthers])
                try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            } catch { return }

            let inputNode = self.audioEngine.inputNode
            let inputFormat = inputNode.outputFormat(forBus: 0)
            guard inputFormat.sampleRate > 0 && inputFormat.channelCount > 0 else { return }
            
            self.streamAnalyzer = SNAudioStreamAnalyzer(format: inputFormat)
            guard let modelURL = Bundle.main.url(forResource: "QuietNight_Snore_Model 1", withExtension: "mlmodelc") else { return }
            
            do {
                let mlModel = try MLModel(contentsOf: modelURL)
                let request = try SNClassifySoundRequest(mlModel: mlModel)
                
                self.resultsObserver = SnoreObserver(module: self)
                try self.streamAnalyzer!.add(request, withObserver: self.resultsObserver!)
                
                // Tap the microphone
                inputNode.installTap(onBus: 0, bufferSize: 8192, format: inputFormat) { buffer, time in
                    
                    // 0. Calculate current room level in dB (for Pre-Flight calibration)
                    if let channelData = buffer.floatChannelData?[0] {
                        let frames = UInt(buffer.frameLength)
                        var meanSquare: Float = 0.0
                        vDSP_measqv(channelData, 1, &meanSquare, frames)
                        var dbLevel: Float = 10.0 * log10(max(meanSquare, 1e-16))
                        if dbLevel.isNaN || dbLevel.isInfinite || dbLevel < -160 { dbLevel = -160.0 }
                        self.currentNoiseLevelDB = dbLevel
                    }
                    
                    // 1. Send to AI Analyzer
                    self.streamAnalyzer?.analyze(buffer, atAudioFramePosition: time.sampleTime)
                    
                    // 2. Handle Audio Writing (apply gain so playback is audible)
                    DispatchQueue.main.async {
                        if self.isCurrentlyWritingSnore {
                            do {
                                let boosted = self.copyBufferWithGain(buffer, gain: self.snoreRecordingGain)
                                try self.currentAudioFile?.write(from: boosted)
                            } catch {
                                print("Error appending buffer")
                            }
                        } else {
                            // If it's quiet, just maintain a 1-second history buffer
                            self.preSnoreBuffer.append(buffer)
                            if self.preSnoreBuffer.count > 2 {
                                self.preSnoreBuffer.removeFirst()
                            }
                        }
                    }
                }
                
                self.audioEngine.prepare()
                try self.audioEngine.start()
            } catch {}
        }

        AsyncFunction("stopListening") {
            self.audioEngine.stop()
            self.audioEngine.inputNode.removeTap(onBus: 0)
            self.stopRecordingSnore() // Ensure we save any in-progress snore before exiting
            do { try AVAudioSession.sharedInstance().setActive(false) } catch {}
        }
    }
    
    // --- File Writing Helpers ---
    
    func startRecordingSnore() {
        guard !isCurrentlyWritingSnore else { return } // Already recording
        isCurrentlyWritingSnore = true
        
        let format = self.audioEngine.inputNode.outputFormat(forBus: 0)
        let fileName = "snore_\(Int(Date().timeIntervalSince1970)).wav"
        let docsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        currentFileURL = docsDir.appendingPathComponent(fileName)
        
        do {
            currentAudioFile = try AVAudioFile(forWriting: currentFileURL!, settings: format.settings, commonFormat: .pcmFormatFloat32, interleaved: false)
            
            // Write the 1 second of audio that happened right BEFORE the AI triggered (with same gain)
            for buffer in preSnoreBuffer {
                let boosted = self.copyBufferWithGain(buffer, gain: self.snoreRecordingGain)
                try currentAudioFile?.write(from: boosted)
            }
            preSnoreBuffer.removeAll()
            
        } catch {
            print("Failed to start audio file")
            isCurrentlyWritingSnore = false
        }
    }
    
    func stopRecordingSnore() {
        guard isCurrentlyWritingSnore, let fileURL = currentFileURL else { return }
        
        // Close the file
        currentAudioFile = nil
        isCurrentlyWritingSnore = false
        
        // Duration from file (seconds)
        var durationSeconds: Double = 0
        let asset = AVURLAsset(url: fileURL)
        let duration = asset.duration
        if duration.isNumeric && duration.value > 0 {
            durationSeconds = CMTimeGetSeconds(duration)
        }
        
        let confidenceToSend = lastSnoringConfidence
        lastSnoringConfidence = 0.99 // reset for next clip
        
        var payload: [String: Any] = [
            "confidence": NSNumber(value: confidenceToSend),
            "timestamp": Date().timeIntervalSince1970,
            "audioFileUri": fileURL.absoluteString
        ]
        if durationSeconds > 0 {
            payload["durationSeconds"] = NSNumber(value: durationSeconds)
        }
        
        sendEvent("onSnoreDetected", payload)
    }

    /// Copy buffer and apply gain (clamped to [-1, 1]) so snore clips are audible on playback.
    private func copyBufferWithGain(_ buffer: AVAudioPCMBuffer, gain: Float) -> AVAudioPCMBuffer {
        let format = buffer.format
        let frameCount = buffer.frameLength
        guard let outBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            return buffer
        }
        outBuffer.frameLength = frameCount
        let channelCount = Int(format.channelCount)
        for ch in 0..<channelCount {
            guard let src = buffer.floatChannelData?[ch],
                  let dst = outBuffer.floatChannelData?[ch] else { continue }
            for i in 0..<Int(frameCount) {
                let s = src[i] * gain
                dst[i] = max(-1.0, min(1.0, s))
            }
        }
        return outBuffer
    }

    private func cleanupOldSnoreFiles() {
        let fileManager = FileManager.default
        guard let docsDir = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        do {
            let fileURLs = try fileManager.contentsOfDirectory(at: docsDir, includingPropertiesForKeys: [.creationDateKey])
            let sevenDaysAgo = Date().addingTimeInterval(-7 * 24 * 60 * 60)
            for fileURL in fileURLs {
                if fileURL.lastPathComponent.hasPrefix("snore_") && fileURL.pathExtension == "wav" {
                    let resourceValues = try fileURL.resourceValues(forKeys: [.creationDateKey])
                    if let creationDate = resourceValues.creationDate, creationDate < sevenDaysAgo {
                        try fileManager.removeItem(at: fileURL)
                    }
                }
            }
        } catch {}
    }
}

// --- The Observer AI Logic ---
class SnoreObserver: NSObject, SNResultsObserving {
    weak var module: ExpoSnoreDetectorModule?
    private var lastSnoreTime: Date = Date.distantPast
    
    init(module: ExpoSnoreDetectorModule) { self.module = module }
    
    func request(_ request: SNRequest, didProduce result: SNResult) {
        guard let classificationResult = result as? SNClassificationResult,
              let topClassification = classificationResult.classifications.first else { return }
        
        let now = Date()
        
        // Is it a snore?
        if topClassification.identifier == "Snoring" && topClassification.confidence > 0.90 {
            self.lastSnoreTime = now
            self.module?.lastSnoringConfidence = topClassification.confidence
            
            // Tell the module to start appending audio to the file (if it isn't already)
            DispatchQueue.main.async {
                self.module?.startRecordingSnore()
            }
        } else {
            // It's NOT a snore.
            // Have we been quiet for more than 4 seconds?
            if now.timeIntervalSince(self.lastSnoreTime) > 4.0 {
                // The snoring has officially stopped. Tell the module to finish the file.
                DispatchQueue.main.async {
                    self.module?.stopRecordingSnore()
                }
            }
        }
    }
}
