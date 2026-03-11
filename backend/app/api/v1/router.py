"""Aggregate all v1 API routes under prefix /api."""

from fastapi import APIRouter

from app.api.v1 import auth, auth_credentials, onboarding as onboarding_routes, partner, sessions, experiments, epworth, journey, insights, recommendations

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_credentials.router)
api_router.include_router(auth.router)
api_router.include_router(onboarding_routes.router)
api_router.include_router(partner.router, prefix="/partner", tags=["partner"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(experiments.router, prefix="/experiments", tags=["experiments"])
api_router.include_router(epworth.router, prefix="/epworth", tags=["epworth"])
api_router.include_router(journey.router)
api_router.include_router(insights.router)
api_router.include_router(recommendations.router)
