"""Endesha majaribio yote ya Msango Maduka: python3 tests/run_all.py
Inatumia Firebase ya kuiga (fakefb.js) — haigusi data halisi."""
import subprocess, sys, os, glob, re, time
here = os.path.dirname(os.path.abspath(__file__))
tests = sorted(glob.glob(os.path.join(here, "t_*.py")))
ok, bad = [], []
for t in tests:
    name = os.path.basename(t)[:-3]; t0 = time.time()
    try:
        r = subprocess.run([sys.executable, t], cwd=here, capture_output=True, text=True, timeout=240)
        out = r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        out, r = "TIMEOUT", None
    errs = re.findall(r"^ERRS (.*)$", out, re.M)
    failed = (r is None) or r.returncode != 0 or "Traceback" in out or any(e.strip() != "[]" for e in errs)
    (bad if failed else ok).append(name)
    print(("❌" if failed else "✅"), name, f"({time.time() - t0:.0f}s)")
    if failed: print("   " + "\n   ".join(out.strip().splitlines()[-12:]))
print(f"\nMATOKEO: {len(ok)} yamepita, {len(bad)} yameshindwa" + (": " + ", ".join(bad) if bad else ""))
sys.exit(1 if bad else 0)
