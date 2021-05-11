import { ShowHide, FormHelper, DragList } from 'elm-app';
import { Page } from 'page';
import { CheckListListData, CheckListData } from 'types/check-list';

export class CheckListPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Check-Lists');

		// Populate the check-list list.
		this._populateCheckListList();
	}

	private _populateCheckListList(): void {
		// Get the check-list list.
		this.app.ws.send({
			module: 'check-list',
			command: 'listCheckLists'
		}).then((checkListListData: CheckListListData) => {
			// Add the HTML as a draggable list.
			let html = '<DragList onReinsert="_checkListListReinserted">';
			for (const checkListListItem of checkListListData) {
				html += /* html */`
					<p data-id="${checkListListItem.id}">
						<button class="grab icon"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
						<button class="list" onclick="_viewCheckList|${checkListListItem.id}">${checkListListItem.title}</button>
						<button class="delete icon" onclick="_openRemoveCheckListPanel|${checkListListItem.id}"><icon src="assets/icons/close.svg" alt="delete"></icon></button>
					</p>`;
			}
			html += '</DragList>';
			const checkListsElem = this.query('.check-lists', Element)!;
			this.setHtml(html, checkListsElem, this);
		});
	}

	/** Called when the drag list of check-lists has reinserted a list item. */
	private _checkListListReinserted(_dragList: DragList, elem: HTMLElement, before: HTMLElement | undefined): void {
		this.app.ws.send({
			module: 'check-list',
			command: 'reinsertCheckList',
			params: {
				id: elem.firstElementChild!.getAttribute('data-id')!,
				beforeId: before !== undefined ? before.firstElementChild!.getAttribute('data-id')! : undefined
			}
		});
	}

	/** Opens a panel. */
	private _openAddCheckListPanel(): void {
		// Get the shared users.
		this.app.ws.send({
			module: 'users',
			command: 'listUsers'
		}).then((users: string[]) => {
			// Get the panel.
			const panel = this.query(`.add-check-list-panel`, HTMLElement)!;
			// Show the panel.
			ShowHide.show(panel);
			// Setup the shared users elements.
			const usersElem = panel.querySelector('.add-users') as Element;
			let html = '';
			for (const user of users) {
				if (user !== this.app.user) {
					html += `<ElmCheckBox name="user-${user}">${user}</ElmCheckBox>`;
				}
			}
			this.insertHtml(html, usersElem, undefined, this);
		});
	}

	private _openRemoveCheckListPanel(id: string): void {
		this.app.ws.send({
			module: 'check-list',
			command: 'getCheckList',
			params: {
				id: id
			}
		}).then((checkListData: CheckListData) => {
			// Get the panel.
			const panel = this.query('.remove-check-list-panel', HTMLElement)!;
			// Show the panel.
			ShowHide.show(panel);
			// Set the check-list title.
			const titleElem = panel.querySelector('.title')!;
			titleElem.innerHTML = checkListData.title;
			// Set the check-list id.
			const idElem = panel.querySelector('.id') as HTMLInputElement;
			idElem.value = id;
			// Toggle the permanently delete message, if needed.
			const warning = panel.querySelector('.warning') as HTMLElement;
			if (checkListData.users.length === 1) {
				warning.style.display = 'block';
			}
			else {
				warning.style.display = 'none';
			}
		});
	}

	private _viewCheckList(id: string): void {
		this.app.router.pushQuery({
			page: 'check-list-edit',
			id: id
		}, true);
	}

	/** Closes a panel. */
	private _closePanel(className: string): void {
		ShowHide.hide(this.query(`.${className}`, HTMLElement)!);
	}

	private _toggleEditCheckListButtons(): void {
		const buttons = this.root.querySelectorAll('.grab, .delete') as NodeListOf<HTMLButtonElement>;
		for (const button of buttons) {
			button.style.display = button.style.display === 'block' ? 'none' : 'block';
		}
	}

	private _addCheckList(): void {
		const values = FormHelper.getValues(this.query('.add-check-list-panel', Element)!);
		const title = values.get('title');
		const users: string[] = [];
		for (const [name, value] of values) {
			if (name.startsWith('user-') && value === true) {
				users.push(name.substring('user-'.length));
			}
		}
		this.app.ws.send({
			module: 'check-list',
			command: 'addCheckList',
			params: {
				title: title,
				users: users
			}
		}).then(() => {
			this._closePanel('add-check-list-panel');
			this._populateCheckListList();
		});
	}

	private _removeCheckList(): void {
		const values = FormHelper.getValues(this.query('.remove-check-list-panel', Element)!);
		const id = values.get('id') as string;
		this.app.ws.send({
			module: 'check-list',
			command: 'removeCheckList',
			params: {
				id: id
			}
		}).then(() => {
			this._closePanel('remove-check-list-panel');
			this._populateCheckListList();
		});
	}
}

CheckListPage.html = /* html */`
	<div>
		<div class="check-lists"></div>
		<div class="toolbar">
			<button onclick="_toggleEditCheckListButtons"><icon src="assets/icons/wrench.svg" alt="Edit check-list list"></icon></button>
			<button onclick="_openAddCheckListPanel"><icon src="assets/icons/plus.svg" alt="Add check list"></icon></button>
		</div>
		<div class="add-check-list-panel panel" style="display: none;">
			<button class="close icon" onclick="_closePanel|add-check-list-panel"><icon src="assets/icons/close.svg" alt="Close"></icon></button>
			<h1>Make a New Check-List</h1>
			<p>Enter the title of the check-list.</p>
			<p><input name="title" type="text" value="" width="10rem" class="input"></input></p>
			<p>Who do you want to share it with?</p>
			<p class="add-users" class="input"></p>
			<button class="fullWidth submit" onclick="_addCheckList">Create</button>
		</div>
		<div class="remove-check-list-panel panel" style="display: none;">
			<button class="close icon" onclick="_closePanel|remove-check-list-panel"><icon src="assets/icons/close.svg" alt="Close"></icon></button>
			<h1>Remove</h1>
			<p>Are you sure you want to remove this check-list?</p>
			<p class="title" style="font-weight: bold;"></p>
			<p class="warning" style="display: none;">This check-list is shared with no one else and so it will be permanently deleted.</p>
			<input class="id" name="id" type="text" style="display: none;"></input>
			<p><button class="fullWidth submit" onclick="_removeCheckList">Remove</button></p>
		</div>
	</div>
	`;

CheckListPage.css = /* css */`
	.CheckListPage {
		display: grid;
		grid-template-rows: 1fr 2.5rem;
		height: 100%;
	}
	.CheckListPage > .check-lists {
		overflow-y: auto;
		padding: .5rem;
	}
	.CheckListPage > .check-lists p {
		margin-bottom: .5rem;
		text-align: center;
		line-height: 2rem;
	}
	.CheckListPage > .check-lists p > button.list {
		height: 2rem;
	}
	.CheckListPage > .check-lists p > button.grab {
		float: left;
		display: none;
	}
	.CheckListPage > .check-lists p > button.delete {
		float: right;
		display: none;
	}
	.CheckListPage > .toolbar {
		background: var(--color1);
		color: var(--color4);
		fill: var(--color4);
		text-align: right;
		padding: .25rem;
	}
	.CheckListPage > .toolbar button {
		margin-right: .25rem;
		width: 2rem;
		height: 2rem;
		padding: 0;
	}
	.CheckListPage > .toolbar button:last-child {
		margin-right: 0;
	}
	.CheckListPage > .toolbar button:active {
		background: var(--color3);
	}
	.CheckListPage > .panel {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background: var(--color6);
		padding: .5rem;
	}
	.CheckListPage > .panel button.close {
		float: right;
	}
	`;

CheckListPage.register();
