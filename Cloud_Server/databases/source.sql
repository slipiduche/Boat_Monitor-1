/*FIRST TIME USE SQL SCRIPT*/
DROP DATABASE IF EXISTS BOAT_MONITOR;

CREATE DATABASE BOAT_MONITOR;

USE BOAT_MONITOR;


CREATE TABLE USERS
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    username VARCHAR(320), 
    pswrd TEXT NOT NULL,
    names TEXT NOT NULL,
    mail VARCHAR(320),
    usertype INTEGER NOT NULL, #--1 Viewer, 2 Supervisor, 3 Admin, 4 Super Admin
    latt INTEGER NOT NULL, #--number of longin attempts withinv X mins
    ldt DATETIME, #--date of last login Attepmt
    blocked TINYINT NOT NULL,
    st TINYINT NOT NULL, #--0 DISABLED, 1 ENABLED
    approval INTEGER NOT NULL, #-- 0 Pending for approvale, 1 approved, 2 declined
    lva INTEGER, #-- Last viewd alerd id
    dt DATETIME NOT NULL,

    PRIMARY KEY(id)
);

CREATE TABLE BOATS
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    mac VARCHAR(34) UNIQUE,
    boat_name TEXT,
    max_st FLOAT,
    resp INTEGER,
    resp_name TEXT,
    st TINYINT NOT NULL, #-- 0 Disabled, 1 Enabled
    dt DATETIME NOT NULL,
    obs TEXT,

    PRIMARY KEY(id),

    CONSTRAINT FK_RESP_U
        FOREIGN KEY (resp)
        REFERENCES USERS (id),
);



CREATE TABLE JOURNEYS
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    ini DATETIME NOT NULL,
    ed DATETIME NOT NULL,
    start_user INTEGER NOT NULL,
    end_user INTEGER,
    boat_id INTEGER NOT NULL,
    i_weight FLOAT,
    f_weight FLOAT,
    s_img INTEGER,
    total_img INTEGER,
    synced TINYINT NOT NULL,
    alert TINYINT NOT NULL,
    eta FLOAT,
    obs TEXT,

    PRIMARY KEY(id),

    CONSTRAINT FK_BOAT_ID
        FOREIGN KEY (boat_id)
        REFERENCES BOATS (id),

    CONSTRAINT FK_ST_U
        FOREIGN KEY (start_user)
        REFERENCES USERS (id),

    CONSTRAINT FK_ED_U
        FOREIGN KEY (end_user)
        REFERENCES USERS (id)
);


CREATE TABLE HISTORICS
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    boat_id INT NOT NULL, #--unique identifier for pi in the boat
    journey_id INT NOT NULL,
    cont_status TEXT NOT NULL, #--'OPEN' OR 'CLOSED'
    open_time FLOAT,
    cont_weight FLOAT NOT NULL, #--KG
    bat FLOAT,
    dsk FLOAT,
    temp FLOAT,
    b_location TEXT NOT NULL, #--LAT, LONG? gOOGLE COMPATIBLE
    TiP FLOAT,
    fl_name TEXT NOT NULL, #--filename
    dt DATETIME NOT NULL, #--date of event
    reg DATETIME NOT NULL, #--date of data reception
    

    PRIMARY KEY(id),

    CONSTRAINT FK_JOURNEY
        FOREIGN KEY (journey_id) 
        REFERENCES JOURNEYS (id)
            ON DELETE CASCADE,

    CONSTRAINT FK_BOAT
        FOREIGN KEY (boat_id)
        REFERENCES BOATS (id)
);

CREATE TABLE FILES
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    fl_name TEXT NOT NULL,
    fl_type TEXT NOT NULL,
    fl_path TEXT NOT NULL,
    fl_url TEXT NOT NULL,
    journey_id INTEGER NOT NULL,
    boat_id INTEGER NOT NULL,
    cam INTEGER,
    rl INT,
    dt DATETIME NOT NULL,
    reg DATETIME NOT NULL,

    PRIMARY KEY(id),

    CONSTRAINT FK_JOURNEY_F
        FOREIGN KEY (journey_id) 
        REFERENCES JOURNEYS (id)
            ON DELETE CASCADE,

    CONSTRAINT FK_BOAT_F
        FOREIGN KEY (boat_id)
        REFERENCES BOATS (id)
            ON DELETE CASCADE
);

CREATE TABLE ALERTS
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    hist_id INTEGER,
    boat_id INTEGER NOT NULL,
    journey_id INTEGER NOT NULL,
    ta TINYINT NOT NULL,
    wa TINYINT NOT NULL,
    ua TINYINT NOT NULL,
    sus TINYINT NOT NULL,
    dt DATETIME NOT NULL,
    obs TEXT,

    PRIMARY KEY(id),

    
    CONSTRAINT FK_HIST_A
        FOREIGN KEY (hist_id)
        REFERENCES HISTORICS (id)
            ON DELETE CASCADE,
    
    CONSTRAINT FK_BOAT_A
        FOREIGN KEY (boat_id)
        REFERENCES BOATS (id)
            ON DELETE CASCADE,

    CONSTRAINT FK_JOURNEY_A
        FOREIGN KEY (journey_id) 
        REFERENCES JOURNEYS (id)
            ON DELETE CASCADE
);

CREATE TABLE REQUESTS
(
    id INTEGER AUTO_INCREMENT,
    fl_type TEXT NOT NULL,
    fl_path TEXT NOT NULL,
    user_id INTEGER,
    dt DATETIME,

    PRIMARY KEY (id),

    CONSTRAINT FK_USER_R
        FOREIGN KEY (user_id)
        REFERENCES USERS (id)
);

INSERT INTO USERS (username,pswrd,names,mail,usertype,latt,blocked,st,approval,dt) VALUES 
    (
        'orbittas@orbittas.com',
        '$2b$10$wLj4ndTj2fr5tSjcU4tUYu728JpxjlngTBFrFI5UeZDFeccUk6BPy',
        'Orbittas',
        'ricardo@orbittas.com',
        4,
        0,
        0,
        1,
        1,
        '2021/4/27 19:35:00'  
    );

INSERT INTO USERS (username,pswrd,names,mail,usertype,latt,blocked,st,approval,dt) 
    VALUES 
    (
        'SUD@orbittas.com',
        '$2b$10$tKgldLwEBI7vjXKcKWue/Of636wzx0xwJ/BsywDERHS2bwodNO1R6',
        '-',
        'ricardo@orbittas.com',
        1,
        0,
        0,
        1,
        1,
        '2021/4/29 09:37:00'  
    );





INSERT INTO BOATS(mac,boat_name,max_st,resp,resp_name,st,dt,obs)
    VALUES
    (
        'b8:27:eb:4f:15:95',
        'CAT',
        '491.7',
        1,
        'Orbittas',
        0,
        '2021/4/29 09:37:00',
        'TEST DATA'
   );

INSERT INTO JOURNEYS(ini,ed,start_user,end_user,boat_id,i_weight,f_weight,s_img,total_img,synced,alert,eta,obs)
    VALUES
    (
        '2021/4/27 19:35:00',
        '2021/4/27 19:35:00',
        1,
        1,
        1,
        30.7,
        417.15,
        0,
        0,
        1,
        1,
        NULL,
        'TEST DATA'
    );

INSERT INTO HISTORICS(boat_id,journey_id,cont_status,open_time,cont_weight,bat,dsk,temp,b_location,TiP,fl_name,dt,reg)
    VALUES
    (
        1,
        1,
        1,
        900,
        417.15,
        85.5,
        27.1,
        10.1,
        '41°24''12.2"N 2°10''26.5"E',
        50,
        'B1_042220211937415959.txt',
        '2021/4/27 19:35:00',
        '2021/4/27 19:35:00'
    );

INSERT INTO FILES(fl_name,fl_type,fl_path,fl_url,journey_id,boat_id,cam,rl,dt,reg)
    VALUES
    (
        'B1_042220211937415959.txt',
        '.txt',
        './files/historics/journey1/B1_042220211937415959.txt',
        'files/1/1',
        1,
        1,
        null,
        1,
        '2021/4/27 19:35:00',
        '2021/4/27 19:35:00'
    );

INSERT INTO ALERTS(hist_id,boat_id,journey_id,ta,wa,ua,sus,dt,obs)
    VALUES
    (
        1,
        1,
        1,
        0,
        0,
        0,
        1,
        '2021/4/27 19:35:00',
        'Sucpicious activity'
    );

CREATE USER IF NOT EXISTS 'orbittas_b'@'localhost' IDENTIFIED WITH mysql_native_password BY '#B04tTr4ck3r++';

GRANT ALL PRIVILEGES ON BOAT_MONITOR.* TO 'orbittas_b'@'localhost';

FLUSH PRIVILEGES;

SHOW VARIABLES LIKE 'validate_password%';
