
import json
from datetime import date

def test_date_serialization(use_isoformat=False):
    payload = {
        "count_date": date.today(),
        "notes": "Test session"
    }

    if use_isoformat:
        if payload.get('count_date'):
            payload['count_date'] = payload['count_date'].isoformat()
            
    try:
        json_str = json.dumps(payload)
        print(f"Success with use_isoformat={use_isoformat}: {json_str}")
    except TypeError as e:
        print(f"Failed with use_isoformat={use_isoformat}: {e}")

if __name__ == "__main__":
    print("--- Testing without fix ---")
    test_date_serialization(use_isoformat=False)
    print("\n--- Testing with fix ---")
    test_date_serialization(use_isoformat=True)
