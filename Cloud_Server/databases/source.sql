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
    lj INTEGER,
    on_journey TINYINT,
    st TINYINT NOT NULL, #-- 0 Disabled, 1 Enabled
    dt DATETIME NOT NULL,
    obs TEXT,

    PRIMARY KEY(id),

    CONSTRAINT FK_RESP_U
        FOREIGN KEY (resp)
        REFERENCES USERS (id)
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

CREATE TABLE PARAMS 
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    dweight FLOAT,
    dtemp FLOAT,
    time_out FLOAT,
    user_id INTEGER NOT NULL,
    dt DATETIME NOT NULL,

    PRIMARY KEY(id),

    CONSTRAINT FK_USER_PAR
        FOREIGN KEY (user_id) 
        REFERENCES USERS (id)
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


DELIMITER $$

CREATE PROCEDURE bm_REQUESTS_INS(IN ftype TEXT, IN fpath TEXT, IN fl TEXT, IN user INT, IN dat DATETIME)

BEGIN

    INSERT INTO REQUESTS (fl_type,fl_path,user_id,dt) VALUES (ftype,fpath,user,dat);

    SET @ID = LAST_INSERT_ID();

    SET @PATH = CONCAT(fpath,'/R',@ID,'/',fl);

    UPDATE REQUESTS SET fl_path = @PATH WHERE id = @ID;

    SELECT @ID id;

END $$

CREATE PROCEDURE bm_JOURNEYS_ST(IN ini0 DATETIME,IN start_user0 INT,IN boat_id0 INT,IN i_weight0 FLOAT,IN s_img0 TINYINT,IN total_img0 TINYINT,IN synced0 TINYINT,IN obs0 TEXT,IN alert0 TINYINT)

BEGIN

    INSERT INTO JOURNEYS (ini,start_user,boat_id,i_weight,s_img,total_img,synced,obs,alert) 
        VALUES (ini0,start_user0,boat_id0,i_weight0,s_img,total_img0,synced0,obs0,alert0);

    SET @ID = LAST_INSERT_ID();

    UPDATE BOATS SET on_journey = 1, SET lj = @ID WHERE id = boat_id0;

    SELECT @ID id;

END $$

CREATE PROCEDURE bm_JOURNEYS_ED(IN id0 INT, IN ed0 DATETIME,IN f_weight0 FLOAT, IN obs0 TEXT)

BEGIN
    
    UPDATE JOURNEYS SET ed = ed0, f_weight = f_weight0, obs = obs0 WHERE id = id0;

    SET @ID = (SELECT boat_id FROM JOURNEYS WHERE id = id0);

    UPDATE BOATS SET on_journey = 0 WHERE id = @ID;

END $$

DELIMITER ;

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
