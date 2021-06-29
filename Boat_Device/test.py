import time,tkinter;



from datetime import datetime



# t = millis();

# print(t);

# time.sleep(0.001);


# time_elapsed = millis() - t;

# print(time_elapsed);

root = tkinter.Tk();

def tick(start):

    t = time.perf_counter();

    res = t - start;

    print(res);

    root.quit();

start = time.perf_counter();

root.after(1,tick,start);

root.mainloop();

print(time.get_clock_info('perf_counter'));


#time.sleep(0.001);



#print(res.microsecond);