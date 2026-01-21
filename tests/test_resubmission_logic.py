
from datetime import datetime, timedelta

def test_sorting_logic():
    # Simulate current time
    now = datetime.now()
    
    # Simulate Approval History
    # Scenario: 
    # Step 2 rejected 2 hours ago (T1)
    # Step 2 approved 1 hour ago (T2) (New row)
    # Step 3 approved 30 mins ago (T3)
    # Step 4 rejected 1 min ago (T4)
    
    t1 = (now - timedelta(hours=2)).isoformat()
    t2 = (now - timedelta(hours=1)).isoformat()
    t3 = (now - timedelta(minutes=30)).isoformat()
    t4 = (now - timedelta(minutes=1)).isoformat()
    
    print(f"T1 (Old Rejection): {t1}")
    print(f"T4 (New Rejection): {t4}")
    
    approvals = [
        {"id": 1, "step_order": 2, "step_name": "Step 2", "step_status": "REJECTED", "action_at": t1},
        {"id": 2, "step_order": 2, "step_name": "Step 2", "step_status": "APPROVED", "action_at": t2},
        {"id": 3, "step_order": 3, "step_name": "Step 3", "step_status": "APPROVED", "action_at": t3},
        {"id": 4, "step_order": 4, "step_name": "Step 4", "step_status": "REJECTED", "action_at": t4},
    ]
    
    # Logic extracted from requisition_service.py
    rejected_steps = [s for s in approvals if s['step_status'] == 'REJECTED']
    
    print(f"Found {len(rejected_steps)} rejected steps.")
    
    if rejected_steps:
        # Sort by action_at descending (latest first)
        try:
            rejected_steps.sort(key=lambda x: str(x.get('action_at') or ''), reverse=True)
            rejected_step = rejected_steps[0]
            print(f"Selected Rejected Step to Resume: Order {rejected_step['step_order']} (ID: {rejected_step['id']}) at {rejected_step['action_at']}")
            
            if rejected_step['id'] == 4:
                print("SUCCESS: Logic correctly picked the latest rejection.")
            else:
                print("FAILURE: Logic picked an old rejection.")
        except Exception as e:
            print(f"Error sorting: {e}")

if __name__ == "__main__":
    test_sorting_logic()
