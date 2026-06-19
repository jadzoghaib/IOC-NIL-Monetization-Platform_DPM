"""Make the backend package root importable so tests can do
`from services...` / `from routes...` regardless of the pytest invocation dir.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
