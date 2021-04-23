import { JSONObject } from 'pine-lib';

/*
The data file will be a list of all of the tasks.
There will be a 'list' function that gets all tasks with specific filters, including a specific project.
There will also be another file that lists all of the projects (needed since a project may have no tasks).
A task may exist in multiple projects.
*/

/** The preferences for the tasks app. */
export interface Preferences extends JSONObject {
	useRepeats: boolean, // Use the repeat module
	useTimeManagement: boolean // Use the time management module
}

export interface Project extends JSONObject {
	id: string, // Unique id for the project
	name: string, // The name of the project
	tasks: string[], // The list of task ids that the project contains
}

export interface Task extends JSONObject {
	id: string, // Unique id for the task.
	title: string, // The title of the task
	repeat: {
		startTime: number, // The starting time of the interval
		interval: number, // The interval magnitude
		intervalUnits: string, // The units of the interval
		resetOnClose: boolean, // If true, the repeatFromTime will be set to the time when it is closed
	}
}
