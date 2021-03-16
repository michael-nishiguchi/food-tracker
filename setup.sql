CREATE TABLE log(
    id BIGSERIAL PRIMARY KEY NOT NULL,
    food_name varchar(200) NOT NULL,
    calories integer NOT NULL,
    fat decimal NOT NULL,
    protein decimal NOT NULL,
    date_eaten date NOT NULL,
    servings decimal NOT NULL,
    meal varchar(200) NOT NULL,
    userId bigint NOT NULL
);


ALTER TABLE log ADD COLUMN userId text NOT NULL;

INSERT INTO log (food_name, calories, fat, protein, date_eaten, servings, meal, userID) VALUES('bread', 10, 20, 30, '10/2/2021', 2, 'lunch', 123123123);
