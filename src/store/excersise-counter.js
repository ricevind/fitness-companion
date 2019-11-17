import {writable} from "svelte/store";
import * as defaults from "./default-state"

//Insert store variables here
export const series = writable(defaults.number_of_series);
export const repetitions = writable(defaults.number_of_repetitions);
export const isExercising = writable(defaults.is_exercising);
