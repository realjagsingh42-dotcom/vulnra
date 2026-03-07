import subprocess, time

cmd = [
    r'D:\shield\garak_env\Scripts\python.exe', '-m', 'garak',
    '--model_type', 'ollama',
    '--model_name', 'llama3.2',
    '--probes', 'dan.AutoDANCached',
    '--generations', '1'
]

print('Launching Garak via Popen + DEVNULL...')
t = time.time()
proc = subprocess.Popen(
    cmd,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    cwd=r'D:\shield'
)
print(f'PID: {proc.pid} — waiting...')
try:
    ret = proc.wait(timeout=60)
    print(f'Finished in {time.time()-t:.1f}s, exit={ret}')
except subprocess.TimeoutExpired:
    proc.kill()
    print(f'TIMEOUT after 60s — process killed')

print('Done.')
input('Press Enter to exit...')
