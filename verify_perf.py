
import time
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.services.requisition_service import RequisitionService
from app.core.config import settings

def test_perf():
    print("--- Starting Performance Verification ---")
    print(f"Service Key Loaded (First 10 chars): {settings.SUPABASE_SERVICE_KEY[:10] if settings.SUPABASE_SERVICE_KEY else 'NONE'}")
    
    # Warmup
    print("Warming up (First call)...")
    start = time.time()
    try:
        RequisitionService.get_requisitions(limit=1)
    except Exception as e:
        print(f"Warmup failed: {e}")
        import traceback
        traceback.print_exc()
        return

    end = time.time()
    print(f"Warmup took: {end - start:.4f}s")
    
    # Benchmark
    print("\nRunning benchmark (5 iterations)...")
    times = []
    for i in range(5):
        start = time.time()
        RequisitionService.get_requisitions(limit=50)
        end = time.time()
        duration = end - start
        times.append(duration)
        print(f"Iter {i+1}: {duration:.4f}s")
        
    avg = sum(times) / len(times)
    print(f"\nAverage Time: {avg:.4f}s")
    
    if avg < 0.5:
        print("SUCCESS: Performance is good (< 0.5s)")
    else:
        print("WARNING: Performance might still be slow (> 0.5s)")

if __name__ == "__main__":
    test_perf()
