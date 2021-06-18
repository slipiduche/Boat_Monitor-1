import numpy as np

import cv2

cam = cv2.VideoCapture(0)

print (cam.set (cv2.CAP_PROP_FPS, 30))

cv2.namedWindow("test")

def change_res(width, height):
    cam.set(3, width)
    cam.set(4, height)

img_counter = 0

while True:
    ret, frame = cam.read()
    if not ret:
        print("failed to grab frame")
        break
    cv2.imshow("test", frame)

    k = cv2.waitKey(1)
    if k%256 == 27:
        # ESC pressed
        print("Escape hit, closing...")
        break
    elif k%256 == 32:
        # SPACE pressed
        img_name = "opencv_frame_{}.png".format(img_counter)
        cv2.imwrite(img_name, frame)
        print("{} written!".format(img_name))
        img_counter += 1

cam.release();

# webcam https://gadgets.ndtv.com/mobiles/features/how-to-use-your-phone-as-a-webcam-617643

#  OpenCV Tutorial https://www.youtube.com/watch?v=rKcwcARdg9M

cv2.destroyAllWindows();



# cap = cv.VideoCapture(0)
# # Define the codec and create VideoWriter object
# fourcc = cv.VideoWriter_fourcc(*'XVID')
# out = cv.VideoWriter('output.avi', fourcc, 20.0, (640,  480))
# while cap.isOpened():
#     ret, frame = cap.read()
#     if not ret:
#         print("Can't receive frame (stream end?). Exiting ...")
#         break
#     frame = cv.flip(frame, 0)
#     # write the flipped frame
#     out.write(frame)
#     cv.imshow('frame', frame)
#     if cv.waitKey(1) == ord('q'):
#         break
# # Release everything if job is finished
# cap.release()
# out.release()
# cv.destroyAllWindows()


# frame_rate = 10
# prev = 0

# while capturing:

#     time_elapsed = time.time() - prev
#     res, image = cap.read()

#     if time_elapsed > 1./frame_rate:
#         prev = time.time()

#         # Do something with your image here.
#         process_image()

# threading https://www.tutorialspoint.com/python/python_multithreading.htm