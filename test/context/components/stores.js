import { createStore } from 'swc';

/**
 * Two stores with deliberately different shapes, both keyed by date.
 * The shared child never learns which of them it was handed.
 */
export const mealStore = createStore({
    id: 'mealStore',
    state: {
        days: {
            '2026-09-01': ['Porridge', 'Chicken salad'],
            '2026-09-03': ['Omelette'],
        },
    },
});

export const workoutStore = createStore({
    id: 'workoutStore',
    state: {
        workouts: {
            '2026-09-02': ['Squat', 'Bench'],
            '2026-09-04': ['Deadlift'],
            '2026-09-05': ['Row'],
        },
    },
});
