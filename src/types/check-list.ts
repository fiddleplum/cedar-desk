import { JSONObject } from 'pine-lib';

/*
A list of lists that is specific to users.
*/

export interface CheckListListItem extends JSONObject {
	id: string, // The unique id for the list.
	title: string // The title of the list.
}

/** A list of check-list items. */
export type CheckListListData = CheckListListItem[];

/** A check-list item. */
export type CheckListItem = string | CheckListItem[];

/** A check-list. */
export interface CheckListData extends JSONObject {
	id: string, // A unique id.
	title: string, // The title of the list.
	users: string[], // The list of users that have this check-list in their check-list list.
	items: CheckListItem[]; // The items in the check-list.
}
