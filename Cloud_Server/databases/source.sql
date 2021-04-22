/*FIRST TIME USE SQL SCRIPT*/

CREATE DATABASE BOAT_MONITOR;

USE BOAT_MONITOR;

CREATE TABLE BOATS
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    mac TEXT UNIQUE,
    boat_name TEXT,
    max_st FLOAT,
    resp TEXT,
    st BIT NOT NULL, -- 0 Disabled, 1 Enabled
    obs TEXT,

    PRIMARY KEY(id)
);

CREATE TABLE USERS
{
    id INTEGER NOT NULL AUTO_INCREMENT,
    username TEXT UNIQUE, --@username
    pswrd TEXT NOT NULL,
    names TEXT NOT NULL,
    mail TEXT UNIQUE,
    usertype INTEGER NOT NULL, -- 1 Viewer, 2 Supervisor, 3 Admin, 4 Super Admin
    blocked BIT NOT NULL,
    st BIT NOT NULL, --0 DISABLED, 1 ENABLED
    reg DATETIME NOT NULL,

    PRIMARY KEY(id)
};

CREATE TABLE JOURNEYS
{
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
    synced BIT NOT NULL,
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
};


CREATE TABLE HISTORICS
(
    id INTEGER NOT NULL AUTO_INCREMENT,
    boat_id TEXT NOT NULL, --unique identifier for pi in the boat
    journey_id INT NOT NULL,
    cont_status TEXT NOT NULL, --'OPEN' OR 'CLOSED'
    open_time FLOAT,
    cont_weight FLOAT NOT NULL, --KG
    bat FLOAT.
    dsk FLOAT,
    temp FLOAT,
    b_location TEXT NOT NULL, --LAT, LONG? gOOGLE COMPATIBLE
    TiP FLOAT,
    fl_name TEXT NOT NULL, --filename
    dt DATETIME NOT NULL, --date of event
    reg DATETIME NOT NULL, --date of data reception
    

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
    cam INTEGER NOT NULL,
    rl INT,
    dt DATETIME NOT NULL,
    reg DATETIME NOT NULL,

    PRIMARY KEY(id),

    PRIMARY KEY(id),

    CONSTRAINT FK_JOURNEY
        FOREIGN KEY (journey_id) 
        REFERENCES JOURNEYS (id)
            ON DELETE CASCADE,

    CONSTRAINT FK_BOAT
        FOREIGN KEY (boat_id)
        REFERENCES BOATS (id)
            ON DELETE CASCADE
);

CREATE USER 'orbittas'@'localhost' IDENTIFIED WITH mysql_native_password BY '#B04tTr4ck3r++';

GRANT ALL PRIVILEGES ON STREAMING_SERVER.* TO 'orbittas'@'localhost';

FLUSH PRIVILEGES;

SHOW VARIABLES LIKE 'validate_password%';
