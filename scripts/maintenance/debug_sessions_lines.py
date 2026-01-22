
import asyncio
from app.services.cycle_count_service import CycleCountService

async def check_sessions_data():
    try:
        sessions = CycleCountService.get_sessions()
        if not sessions:
            print("No sessions found.")
            return

        print(f"Found {len(sessions)} sessions.")
        if 'lines' in sessions[0]:
            print("First session lines sample:")
            for l in sessions[0]['lines'][:3]:
                print(l)
        else:
            print("No 'lines' field in session object.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_sessions_data())
