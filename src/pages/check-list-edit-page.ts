import { ShowHide, FormHelper, DragList } from 'elm-app';
import { Page } from 'page';
import { CheckListData, CheckListItem } from 'types/check-list';

export class CheckListEditPage extends Page {
	async initialize(): Promise<void> {
		// Get the id from the router.
		const id = this.app.router.getValue('id');
		if (id === undefined) {
			this.app.router.replaceQuery({
				page: 'check-list'
			}, true);
		}
		// Get the checklist data.
		this.app.ws.send({
			module: 'check-list',
			command: 'getCheckList',
			params: {
				id: id
			}
		}).catch(() => {
			this.query('.title', HTMLElement).innerHTML = 'Check-list Not Found';
		}).then((checkListData: CheckListData) => {
			// Set the title.
			this.query('.title', HTMLElement).innerHTML = checkListData.title;
			let html = '<DragList onReinsert="_itemReinserted" onBeforeGrab="_itemBeforeGrab" onAfterDrag="_itemAfterDrag" onAfterRelease="_itemAfterRelease">';
			if (checkListData.items.length !== 0) {
				for (const item of checkListData.items) {
					html += /* html */`
						<p data-id="${item.id}" data-level="${item.level}" style="margin-left: calc(${item.level} * 1rem)">
							<button class="grab icon"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
							<input class="list" onkeydown="_onKeyDown|${item.id}" oninput="_onInput|${item.id}" value="${item.text}" />
						</p>`;
				}
			}
			else {
				html += /* html */`
					<p data-id="NEW">
						<button class="grab icon"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
						<input onkeydown="_onKeyDown|NEW" oninput="_onInput|NEW"></input>
					</p>`;
			}
			const viewHeight = this.query('.items', HTMLElement).getBoundingClientRect().height;
			html += `</DragList><div style="height: calc(${viewHeight}px - 2rem)"></div>`;
			this.setHtml(this.query('.items', Element), html, this);
		});
	}

	/** Called just before an item will be dragged. */
	private _itemBeforeGrab(_dragList: DragList, elem: HTMLElement): void {
		// Shrink the "child" items below the elem.
		const pElem = elem.firstElementChild!;
		const parentLevel = Number.parseInt(pElem.getAttribute('data-level')!);
		let nextElem = elem.nextElementSibling as HTMLElement | null;
		this._shrunkElems = [];
		while (nextElem !== null) {
			const nextPElem = nextElem.firstElementChild!;
			const nextLevel = Number.parseInt(nextPElem.getAttribute('data-level')!);
			if (nextLevel === parentLevel + 1) {
				nextPElem.classList.add('shrunk');
				this._shrunkElems.push(nextElem);
			}
			else {
				break;
			}
			nextElem = nextElem.nextElementSibling as HTMLElement | null;
		}
	}

	/** Called just after a drag. */
	private _itemAfterDrag(_dragList: DragList, elem: HTMLElement): void {
		const elemBounds = elem.getBoundingClientRect();
		const container = this.query('.items', HTMLElement);
		const containerBounds = container.getBoundingClientRect();
		if (containerBounds.top > elemBounds.top - elemBounds.height) {
			container.scrollTop += elemBounds.top - elemBounds.height - containerBounds.top;
		}
		else if (containerBounds.bottom < elemBounds.bottom + elemBounds.height) {
			container.scrollTop += elemBounds.bottom + elemBounds.height - containerBounds.bottom;
		}
	}

	/** Called just after the drag is released. */
	private _itemAfterRelease(_dragList: DragList, _elem: HTMLElement, _before: HTMLElement | null): void {
		// Remove the shrunk class. Use timeout so the transition happens.
		setTimeout(() => {
			for (const shrunkElem of this._shrunkElems) {
				shrunkElem.firstElementChild!.classList.remove('shrunk');
			}
		}, 100);
	}

	/** Called when the drag list of check-lists has reinserted a list item. */
	private _itemReinserted(_dragList: DragList, elem: HTMLElement, before: HTMLElement | null): void {
		if (before !== null && this._shrunkElems.includes(before)) {
			return;
		}
		// Reinsert the shrunk elems to be after the drag element.
		for (const shrunkElem of this._shrunkElems) {
			elem.parentElement!.insertBefore(shrunkElem, before);
		}
		// this.app.ws.send({
		// 	module: 'check-list',
		// 	command: 'reinsertItems',
		// 	params: {
		// 		id: elem.getAttribute('data-id')!,
		// 		beforeId: before?.getAttribute('data-id')!
		// 	}
		// });
	}

	/** Opens a panel. */
	private async _openEditCheckListPanel(): Promise<void> {
		// Get the check-list data.
		const getCheckListPromise = this.app.ws.send({
			module: 'check-list',
			command: 'getCheckList',
			params: {
				id: this.app.router.getValue('id')
			}
		});
		// Populate the shared users.
		const listUsersPromise = this.app.ws.send({
			module: 'users',
			command: 'listUsers'
		});
		// Wait for the data.
		const [checkListData, users] = await Promise.all([getCheckListPromise, listUsersPromise]) as [CheckListData, string[]];
		// Get the panel.
		const panel = this.query('.edit-check-list-panel', HTMLElement);
		// Show the panel.
		ShowHide.show(panel);
		// Populate the title.
		(panel.querySelector('input[name="title"]') as HTMLInputElement).value = checkListData.title;
		// Populate the shared users.
		const usersElem = panel.querySelector('.edit-users') as Element;
		let html = '';
		for (const user of users) {
			if (user !== this.app.user) {
				html += `<ElmCheckBox name="user-${user}" checked="${checkListData.users.includes(user)}">${user}</ElmCheckBox>`;
			}
		}
		this.setHtml(usersElem, html, this);
	}

	/** Closes a panel. */
	private _closePanel(className: string): void {
		ShowHide.hide(this.query(`.${className}`, HTMLElement));
	}

	private _editCheckList(): void {
		const values = FormHelper.getValues(this.query('.edit-check-list-panel', Element));
		const id = this.app.router.getValue('id') as string;
		const title = values.get('title');
		const users: string[] = [];
		for (const [name, value] of values) {
			if (name.startsWith('user-') && value === true) {
				users.push(name.substring('user-'.length));
			}
		}
		this.app.ws.send({
			module: 'check-list',
			command: 'editCheckList',
			params: {
				id: id,
				title: title,
				users: users
			}
		}).then(() => {
			this.app.router.pushQuery({
				id: id
			}, true);
			this._closePanel('edit-check-list-panel');
		});
	}

	private async _submitInput(id: string): Promise<void> {
		const pElem = this.query(`p[data-id="${id}"]`, HTMLParagraphElement);
		const inputElem = pElem.querySelector('input') as HTMLInputElement;
		if (id === 'NEW') {
			const pNextElem = pElem.nextElementSibling;
			const nextId = pNextElem !== null ? pNextElem.getAttribute('data-id')! : null;
			// call addItem with new text.
			await this.app.ws.send({
				module: 'check-list',
				command: 'insertItem',
				params: {
					checkListId: this.app.router.getValue('id'),
					text: inputElem.value,
					// parent:
					before: nextId
				}
			});
		}
		else {
			// call updateItem with new text.
			await this.app.ws.send({
				module: 'check-list',
				command: 'updateItem',
				params: {
					checkListId: this.app.router.getValue('id'),
					id: id,
					text: inputElem.value
				}
			});
		}
		// Create new item below this one at the same level.
		// Move focus to new item.
	}

	private _goToCheckListListPage(): void {
		this.app.router.pushQuery({
			page: 'check-list'
		}, false);
	}

	private _onKeyDown(id: string, event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			const inputElem = this.query(`p[data-id="${id}"] input`, HTMLInputElement);
			// If the input where enter was pressed has changed,
			if (inputElem.getAttribute('data-changed') === 'true') {
				this._submitInput(id);
			}
		}
	}

	private _onInput(id: string): void {
		const inputElem = this.query(`p[data-id="${id}"] input`, HTMLInputElement);
		inputElem.setAttribute('data-changed', 'true');
	}

	private _shrunkElems!: HTMLElement[];
}

CheckListEditPage.html = /* html */`
	<div>
		<h1 class="title"></h1>
		<div class="items"></div>
		<div class="toolbar">
			<button class="left" onclick="_goToCheckListListPage"><icon src="assets/icons/arrow-left.svg" alt="View check lists"></icon></button>
			<button class="right" onclick="_openEditCheckListPanel"><icon src="assets/icons/wrench.svg" alt="Edit check list"></icon></button>
		</div>
		<div class="edit-check-list-panel panel" style="display: none;">
			<button class="close icon" onclick="_closePanel|edit-check-list-panel"><icon src="assets/icons/close.svg" alt="Close"></icon></button>
			<h1>Edit Check-List</h1>
			<p>Enter the title of the check-list.</p>
			<p><input name="title" type="text" value="" width="10rem"></input></p>
			<p>Who do you want to share it with?</p>
			<p class="edit-users" class="input"></p>
			<button class="fullWidth submit" onclick="_editCheckList">Save</button>
		</div>
	</div>
	`;

CheckListEditPage.css = /* css */`
	.CheckListEditPage {
		display: grid;
		grid-template-rows: 2.5rem 1fr 2.5rem;
		height: calc(100vh - 2.5rem);
	}
	.CheckListEditPage .title {
		margin: 0;
		padding: .5rem 0;
		background: var(--color4);
		text-align: center;
	}
	.CheckListEditPage .items {
		overflow-y: auto;
		padding: .5rem;
		height: 100%;
	}
	.CheckListEditPage .items .DragList p {
		transition: height .25s, padding .25s, margin .25s;
	}
	.CheckListEditPage .items p {
		margin: 0 0 .5rem 0;
		line-height: 2rem;
		height: 1.5rem;
	}
	.CheckListEditPage .items p.shrunk {
		height: 0rem;
		margin: 0rem;
	}
	.CheckListEditPage .items p > button.grab {
		width: 1.5rem;
		height: 1.5rem;
		vertical-align: bottom;
		margin-right: .5rem;
	}
	.CheckListEditPage .items input {
		width: calc(100% - 2rem);
	}
	.CheckListEditPage .toolbar {
		background: var(--color1);
		color: var(--color4);
		fill: var(--color4);
		text-align: right;
		padding: .25rem;
	}
	.CheckListEditPage .toolbar button {
		width: 2rem;
		height: 2rem;
		padding: 0;
	}
	.CheckListEditPage .toolbar .left {
		float: left;
	}
	.CheckListEditPage .toolbar .right {
		float: right;
	}
	.CheckListEditPage .panel {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background: var(--color6);
		padding: .5rem;
	}
	.CheckListEditPage .panel button.close {
		float: right;
	}
	`;

CheckListEditPage.register();
