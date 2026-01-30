
import asyncio
from app.services.cycle_count_service import CycleCountService

async def test_active_lines():
    try:
        print("Fetching active lines...")
        data = CycleCountService.get_active_lines()
        print(f"Count: {len(data)}")
        if len(data) > 0:
            first = data[0]
            print("First Line Sample:")
            print(f"ID: {first.get('id')}")
            print(f"Material: {first.get('material')}")
            print(f"Session Key Present?: {'session' in first}")
            print(f"Session content: {first.get('session')}")
            
            if 'session' in first and first['session'] is None:
                print("WARNING: Session object is None!")
        else:
            print("No active lines found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_active_lines()
