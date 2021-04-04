import { JSONObject } from 'pine-lib';

export interface SunAlarm extends JSONObject {
	id: string, // Unique id for the alarm.
	relativeTo: 'sunrise' | 'sunset', // The reference point for calcing the alarm time.
	angleOffset: number, // The number of degrees relative to the sunrise or sunset.
	timeOffset: number, // A time offset in minutes added on after everything.
	sound: string, // The sound the play.
	days: boolean[], // The days of the week to alarm.
	enabled: boolean // Whether or not the alarm is enabled.
}
