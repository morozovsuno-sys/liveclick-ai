from enum import Enum


class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    STUDIO = "studio"
