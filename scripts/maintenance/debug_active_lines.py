
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv('.env')

from app.services.cycle_count_service import CycleCountService

def test_active_lines():
    print("--- Testing Get Active Lines ---")
    try:
        data = CycleCountService.get_active_lines()
        print(f"Total lines found: {len(data)}")
        if len(data) > 0:
            print("First item sample:")
            print(data[0])
        else:
            print("No active lines returned.")
            
    except Exception as e:
        print("ERROR:")
        print(e)

if __name__ == "__main__":
    test_active_lines()
