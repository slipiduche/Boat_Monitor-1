import time;

it = time.time();

ip = time.perf_counter();

while True:

    print(time.time() - it);

    print(time.perf_counter() - ip)

    time.sleep(1);