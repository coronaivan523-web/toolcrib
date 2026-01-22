$env:PYTHONPATH = "."
py -m uvicorn app.main:app --reload --reload-exclude frontend --host 0.0.0.0 --port 8002
