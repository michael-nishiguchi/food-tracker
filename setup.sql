CREATE TABLE log(
    id BIGSERIAL PRIMARY KEY NOT NULL,
    food_name varchar(200) NOT NULL,
    calories integer NOT NULL,
    fat decimal NOT NULL,
    protein decimal NOT NULL,
    carb decimal NOT NULL,
    date_eaten date NOT NULL,
    servings decimal NOT NULL,
    meal varchar(200) NOT NULL,
    userId bigint NOT NULL
);


ALTER TABLE log ADD COLUMN userId text NOT NULL;
ALTER TABLE log ADD COLUMN carb decimal NOT NULL;

ALTER TABLE log ADD COLUMN date_eaten DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE log ALTER COLUMN date_eaten TYPE date NOT NULL DEFAULT CURRENT_DATE;

INSERT INTO log (food_name, calories, fat, protein, date_eaten, servings, meal, userID) VALUES('bread', 10, 20, 30, '10/2/2021', 2, 'lunch', 123123123);
