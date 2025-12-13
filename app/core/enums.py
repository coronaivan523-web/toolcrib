from enum import Enum

class MovementType(str, Enum):
    IN = "IN"
    OUT = "OUT"
    RETURN = "RETURN"
    ADJUSTMENT_POS = "ADJUSTMENT_POS"
    ADJUSTMENT_NEG = "ADJUSTMENT_NEG"
