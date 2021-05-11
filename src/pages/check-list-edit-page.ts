import { ShowHide, FormHelper, DragList } from 'elm-app';
import { Page } from 'page';
import { JSONObject } from 'pine-lib';
import { CheckListData } from 'types/check-list';

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
			this.query('.title', HTMLElement)!.innerHTML = 'Check-list Not Found';
		}).then((checkListData: CheckListData) => {
			// Set the title.
			this.query('.title', HTMLElement)!.innerHTML = checkListData.title;
			let html = '<DragList id="list" onBeforeGrab="_itemBeforeGrab" onAfterDrag="_itemAfterDrag" onAfterRelease="_itemAfterRelease">';
			if (checkListData.items.length !== 0) {
				for (const item of checkListData.items) {
					html += /* html */`
						<p data-id="${item.id}" data-level="${item.level}" style="margin-left: ${item.level}rem">
							<button class="grab icon" tabindex="-1"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
							<input class="list" onkeydown="_onKeyDown" oninput="_onInput" value="${item.text}" />
						</p>`;
				}
			}
			else {
				html += /* html */`
					<p data-id="NEW" data-level="0" style="margin-left: 0rem">
						<button class="grab icon" tabindex="-1"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
						<input onkeydown="_onKeyDown" oninput="_onInput"></input>
					</p>`;
			}
			html += `</DragList>`;
			this.setHtml(html, this.query('.items', Element)!, this);
			// Add padding so that the bottom element can drag further down.
			const viewHeight = this.query('.items', HTMLElement)!.getBoundingClientRect().height;
			this.query('.DragList', HTMLElement)!.style.paddingBottom = `calc(${viewHeight}px - 2rem)`;
			// Register as a websocket handler.
			this.app.ws.registerHandler('check-list', this._responseHandler.bind(this));
			// Let the server know we want to receive check-list updates.
			this.app.ws.send({
				module: 'check-list',
				command: 'onCheckList',
				params: {
					checkListId: this.app.router.getValue('id')!
				}
			});
		});
		// Set the update interval for changed items.
		this._intervalId = window.setInterval(() => {
			for (const elem of this._changedElems) {
				if (this.root.contains(elem)) {
					this._sendUpdateTextCommand(elem);
				}
			}
		}, 5000);
	}

	/** The destructor. */
	destroy(): void {
		// Unregister as a websocket handler.
		this.app.ws.unregisterHandler('check-list');
		// Let the server know we don't want to receive check-list updates.
		this.app.ws.send({
			module: 'check-list',
			command: 'offCheckList',
			params: {
				checkListId: this.app.router.getValue('id')!
			}
		});
		window.clearInterval(this._intervalId);
		super.destroy();
	}

	/** Called just before an item will be dragged. */
	private _itemBeforeGrab(_dragList: DragList, elem: HTMLElement, event: MouseEvent | TouchEvent): void {
		// Shrink the "child" items below the elem.
		this._draggedOrigLevel = Number.parseInt(elem.getAttribute('data-level')!);
		let nextElem = elem.nextElementSibling as HTMLElement | null;
		this._shrunkElems = [];
		while (nextElem !== null) {
			const nextLevel = Number.parseInt(nextElem.getAttribute('data-level')!);
			if (nextLevel >= this._draggedOrigLevel + 1) {
				nextElem.classList.add('shrunk');
				this._shrunkElems.push(nextElem);
			}
			else {
				break;
			}
			nextElem = nextElem.nextElementSibling as HTMLElement | null;
		}
		// Get the x value of the cursor.
		this._refX = this._getX(event);
	}

	/** Called just after a drag. */
	private _itemAfterDrag(_dragList: DragList, elem: HTMLElement, event: MouseEvent | TouchEvent, beforeElem: HTMLElement | undefined): void {
		// Update the scroll so that the item stays in view.
		const elemBounds = elem.getBoundingClientRect();
		const container = this.query('.items', HTMLElement)!;
		const containerBounds = container.getBoundingClientRect();
		if (containerBounds.top > elemBounds.top - elemBounds.height) {
			container.scrollTop += elemBounds.top - elemBounds.height - containerBounds.top;
		}
		else if (containerBounds.bottom < elemBounds.bottom + elemBounds.height) {
			container.scrollTop += elemBounds.bottom + elemBounds.height - containerBounds.bottom;
		}
		// Get the previous element of where the element would be placed.
		let prevElem;
		if (beforeElem !== undefined) {
			prevElem = beforeElem.previousElementSibling as HTMLElement | null ?? undefined;
		}
		else {
			prevElem = elem.parentElement!.lastElementChild as HTMLElement | null ?? undefined;
		}
		while (prevElem !== undefined && this._shrunkElems.includes(prevElem)) {
			prevElem = prevElem.previousElementSibling as HTMLElement | null ?? undefined;
		}
		if (prevElem === elem) {
			prevElem = prevElem.previousElementSibling as HTMLElement | null ?? undefined;
		}
		// Update any restrictions on the element based on the previous element.
		const prevElemLevel = prevElem !== undefined ? parseInt(prevElem.getAttribute('data-level')!) : -1;
		let elemLevel = parseInt(elem.getAttribute('data-level')!);
		while (elemLevel > prevElemLevel + 1) {
			this._shiftItem(elem, prevElem, true, -1);
			elemLevel -= 1;
		}
		// Update the left margin of the item for dragging left and right.
		const oneRemInPx = parseFloat(getComputedStyle(document.body).fontSize);
		const diffX = this._getX(event) - this._refX;
		let diffLevel = Math.trunc(diffX / oneRemInPx);
		while (diffLevel >= 1) {
			const changedLevel = this._shiftItem(elem, prevElem, true, +1);
			this._refX += changedLevel * oneRemInPx;
			diffLevel -= 1;
		}
		while (diffLevel <= -1) {
			const changedLevel = this._shiftItem(elem, prevElem, true, -1);
			this._refX += changedLevel * oneRemInPx;
			diffLevel += 1;
		}
	}

	/** Called just after the drag is released. */
	private _itemAfterRelease(_dragList: DragList, elem: HTMLElement, beforeElem: HTMLElement | undefined, changed: boolean): void {
		// Reinsert the shrunk elems to be after the drag element.
		if (changed) {
			for (const shrunkElem of this._shrunkElems) {
				elem.parentElement!.insertBefore(shrunkElem, beforeElem ?? null);
			}
		}
		// Remove the shrunk class. Use timeout so the transition happens.
		setTimeout(() => {
			for (const shrunkElem of this._shrunkElems) {
				shrunkElem.classList.remove('shrunk');
			}
		}, 100);
		// Send the update level command.
		this._sendUpdateLevelCommand(elem);
		if (changed) {
			// Send the reinsert item command.
			this._sendReinsertItemCommand(elem, beforeElem);
		}
	}

	/** Returns the x value of the event. */
	private _getX(event: MouseEvent | TouchEvent): number {
		if (event instanceof MouseEvent) {
			return event.clientX;
		}
		else if (event instanceof TouchEvent) {
			if (event.touches.length > 0) {
				return event.touches[0].clientX;
			}
		}
		return NaN;
	}

	/** Sends an addItem command. */
	private _sendAddItemCommand(elem: Element): void {
		const inputElem = elem.querySelector('input')!;
		const checkListId = this.app.router.getValue('id')!;
		const text = inputElem.value;
		const level = parseInt(elem.getAttribute('data-level')!);
		const beforeElem = elem.nextElementSibling;
		const beforeId = beforeElem !== null ? beforeElem.getAttribute('data-id')! : undefined;
		this.app.ws.send({
			module: 'check-list',
			command: 'addItem',
			params: {
				checkListId: checkListId,
				text: text,
				level: level,
				beforeId: beforeId
			}
		}).then((id: string) => {
			elem.setAttribute('data-id', id);
		});
	}

	/** Sends an updateText command. */
	private _sendUpdateTextCommand(elem: Element): void {
		const inputElem = elem.querySelector('input')!;
		const checkListId = this.app.router.getValue('id')!;
		const id = elem.getAttribute('data-id')!;
		const text = inputElem.value;
		this.app.ws.send({
			module: 'check-list',
			command: 'updateText',
			params: {
				checkListId: checkListId,
				id: id,
				text: text
			}
		});
		// Delete it from the changed inputs, since it has just been saved.
		this._changedElems.delete(elem);
	}

	/** Sends an update level command. */
	private _sendUpdateLevelCommand(elem: Element): void {
		const checkListId = this.app.router.getValue('id')!;
		const id = elem.getAttribute('data-id')!;
		const level = parseInt(elem.getAttribute('data-level')!);
		this.app.ws.send({
			module: 'check-list',
			command: 'updateLevel',
			params: {
				checkListId: checkListId,
				id: id,
				level: level
			}
		});
	}

	/** Sends a remove item command. */
	private _sendRemoveItemCommand(elem: Element): void {
		const checkListId = this.app.router.getValue('id')!;
		const id = elem.getAttribute('data-id')!;
		this.app.ws.send({
			module: 'check-list',
			command: 'removeItem',
			params: {
				checkListId: checkListId,
				id: id
			}
		});
	}

	/** Sends a reinsert item command. */
	private _sendReinsertItemCommand(elem: Element, beforeElem: Element | undefined): void {
		const checkListId = this.app.router.getValue('id')!;
		const id = elem.getAttribute('data-id')!;
		this.app.ws.send({
			module: 'check-list',
			command: 'reinsertItem',
			params: {
				checkListId: checkListId,
				id: id,
				beforeId: beforeElem?.getAttribute('data-id') ?? undefined
			}
		});
	}

	/** When a key was pressed while focused on one of the items. */
	private _onKeyDown(event: KeyboardEvent): void {
		// Get the relative item and its input.
		const inputElem = event.target as HTMLInputElement;
		const elem = inputElem.parentElement as HTMLParagraphElement;
		if (event.key === 'Enter') {
			// Create new item below this one at the same level.
			const dragList = this.component('list', DragList);
			const itemLevel = elem.getAttribute('data-level');
			const html = /* html */`
				<p data-id="NEW" data-level="${itemLevel}" style="margin-left: ${itemLevel}rem">
					<button class="grab icon" tabindex="-1"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
					<input class="list" onkeydown="_onKeyDown" oninput="_onInput" value="" />
				</p>`;
			dragList.insertItems(html, elem.nextElementSibling ? elem.nextElementSibling as HTMLElement : undefined);
			// Add any text to the right of the cursor, to the new input.
			const newElem = elem.nextElementSibling as HTMLElement;
			const newInputElem = newElem.querySelector('input')!;
			newInputElem.value = inputElem.value.substring(inputElem.selectionEnd!);
			// Remove any text to the right of the cursor from the old input.
			inputElem.value = inputElem.value.substring(0, inputElem.selectionStart!);
			// Save both items.
			this._sendUpdateTextCommand(elem);
			this._sendAddItemCommand(newElem);
			// Move focus to new item.
			newInputElem.focus();
			newInputElem.setSelectionRange(0, 0);
		}
		else if (event.key === 'Backspace' || event.key === 'Delete') {
			// If it is already blank,
			if (event.key === 'Backspace'
					&& inputElem.selectionStart === 0 && inputElem.selectionEnd === 0
					&& elem.previousElementSibling !== null) {
				// Append any text in the input to the prev item.
				const prevElem = elem.previousElementSibling as HTMLElement;
				const prevInput = prevElem.querySelector('input')!;
				const prevInputValueLength = prevInput.value.length;
				prevInput.value = prevInput.value + inputElem.value;
				// Update the prev item.
				this._sendUpdateTextCommand(prevElem);
				// Focus on the end of the previous item.
				prevInput.focus();
				prevInput.setSelectionRange(prevInputValueLength, prevInputValueLength);
				// Send the remove item command.
				this._sendRemoveItemCommand(elem);
				// Remove the item from the list.
				const dragList = this.component('list', DragList);
				dragList.removeItem(elem);
				// Make the event not do an actual backspace.
				event.preventDefault();
			}
			else if (event.key === 'Delete'
					&& inputElem.selectionStart === inputElem.value.length && inputElem.selectionEnd === inputElem.value.length
					&& elem.nextElementSibling !== null) {
				// Prepend any text in the input to the next item.
				const nextElem = elem.nextElementSibling as HTMLElement;
				const nextInput = nextElem.querySelector('input')!;
				nextInput.value = inputElem.value + nextInput.value;
				// Focus on the end of the next item.
				nextInput.focus();
				nextInput.setSelectionRange(inputElem.value.length, inputElem.value.length);
				// Update the next item.
				this._sendUpdateTextCommand(nextElem);
				// Send the remove item command.
				this._sendRemoveItemCommand(elem);
				// Remove the item from the list.
				const dragList = this.component('list', DragList);
				dragList.removeItem(elem);
				// Make the event not do an actual backspace.
				event.preventDefault();
			}
		}
		else if (event.key === '[' && event.ctrlKey) {
			const changed = this._shiftItem(elem, elem.previousElementSibling as HTMLElement | null ?? undefined, true, -1);
			if (changed !== 0) {
				this._sendUpdateLevelCommand(elem);
			}
		}
		else if (event.key === ']' && event.ctrlKey) {
			const changed = this._shiftItem(elem, elem.previousElementSibling as HTMLElement | null ?? undefined, true, +1);
			if (changed !== 0) {
				this._sendUpdateLevelCommand(elem);
			}
		}
	}

	/** Shifts an item to the right or left. Returns the actual number of levels changed. */
	private _shiftItem(elem: HTMLElement, prevElem: HTMLElement | undefined, includeChildren: boolean, direction: number): number {
		// Make sure that direction is just -1 or +1.
		direction = direction > 0 ? +1 : -1;
		// Update the left margin of the item for dragging left and right.
		const level = parseInt(elem.getAttribute('data-level')!);
		const prevLevel = prevElem !== undefined ? parseInt(prevElem.getAttribute('data-level')!) : -1;
		// Move to the right if needed.
		const newLevel = Math.max(0, Math.min(level + direction, prevLevel + 1));
		if (newLevel !== level) {
			elem.setAttribute('data-level', `${newLevel}`);
			elem.style.marginLeft = `${newLevel}rem`;
			// Move all children the same amount.
			if (includeChildren) {
				let nextElem = elem.nextElementSibling as HTMLElement | null ?? undefined;
				while (nextElem !== undefined) {
					const childLevel = parseInt(nextElem.getAttribute('data-level')!);
					// It's not a child, so finish.
					if (childLevel <= level) {
						break;
					}
					const newChildLevel = childLevel + newLevel - level;
					nextElem.setAttribute('data-level', `${newChildLevel}`);
					nextElem.style.marginLeft = `${newChildLevel}rem`;
					nextElem = nextElem.nextElementSibling as HTMLElement | null ?? undefined;
				}
			}
			return newLevel - level;
		}
		return 0;
	}

	/** When one of the items values have changed. */
	private _onInput(event: InputEvent): void {
		this._changedElems.add((event.target as HTMLInputElement).parentElement!);
	}

	/** When a command is received from the server. */
	private _responseHandler(response: JSONObject): void {
		const command = response.command;
		const dragList = this.component('list', DragList);
		if (command === 'addItem') {
			const id = response.id as string;
			const level = response.level as number;
			const text = response.text as string;
			const beforeId = response.beforeId as string | undefined;
			// Get the beforeElem.
			const beforeElem = beforeId !== undefined ? this.query(`[data-id="${beforeId}"]`, HTMLElement) : undefined;
			// Create new item below this one at the same level.
			const html = /* html */`
				<p data-id="${id}" data-level="${level}" style="margin-left: ${level}rem">
					<button class="grab icon" tabindex="-1"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
					<input class="list" onkeydown="_onKeyDown" oninput="_onInput" value="${text}" />
				</p>`;
			dragList.insertItems(html, beforeElem);
		}
		else if (command === 'removeItem') {
			const id = response.id as string;
			const elem = this.query(`[data-id="${id}"]`, HTMLElement);
			if (elem !== undefined) {
				dragList.removeItem(elem);
			}
		}
		else if (command === 'updateText') {
			const id = response.id as string;
			const text = response.text as string;
			const elem = this.query(`[data-id="${id}"] input`, HTMLInputElement);
			if (elem !== undefined) {
				elem.value = text;
			}
		}
		else if (command === 'updateLevels') {
			const items = response.items as [[string, number]];
			for (let i = 0; i < items.length; i++) {
				const id = items[i][0];
				const level = items[i][1];
				const elem = this.query(`[data-id="${id}"]`, HTMLElement);
				if (elem !== undefined) {
					elem.setAttribute('data-level', `${level}`);
					elem.style.marginLeft = `${level}rem`;
				}
			}
		}
		else if (command === 'reinsertItems') {
			const ids = response.ids as string[];
			const beforeId = response.beforeId as string | undefined;
			// Get the beforeElem.
			const beforeElem = beforeId !== undefined ? this.query(`[data-id="${beforeId}"]`, HTMLElement) : undefined;
			// Reinsert the items, one at a time.
			for (let i = 0; i < ids.length; i++) {
				const id = ids[i];
				const elem = this.query(`[data-id="${id}"]`, HTMLElement);
				if (elem !== undefined) {
					elem.parentElement!.insertBefore(elem, beforeElem ?? null);
				}
			}
		}
	}

	//// EDIT PAGE

	/** Goes back to the check-list list page. */
	private _goToCheckListListPage(): void {
		this.app.router.pushQuery({
			page: 'check-list'
		}, false);
	}

	/** Opens the edit check-list panel. */
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
		const panel = this.query('.edit-check-list-panel', HTMLElement)!;
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
		this.setHtml(html, usersElem, this);
	}

	/** Closes a panel. */
	private _closePanel(className: string): void {
		ShowHide.hide(this.query(`.${className}`, HTMLElement)!);
	}

	/** Sends the command to edit the check-list properties. */
	private _editCheckList(): void {
		const values = FormHelper.getValues(this.query('.edit-check-list-panel', Element)!);
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

	/** The list of items currently shrunk. */
	private _shrunkElems!: HTMLElement[];

	/** The original level of the dragged item. */
	private _draggedOrigLevel: number = 0;

	/** The interval id for updating changed items. */
	private _intervalId!: number;

	/** The set of changed items. */
	private _changedElems: Set<Element> = new Set();

	/** The initial x-value of the dragged item. */
	private _refX: number = 0;
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
		transition: height .25s, margin-left .25s;
	}
	.CheckListEditPage .items p {
		margin: 0;
		padding: 0 0 .5rem 0;
		line-height: 2rem;
		height: 2rem;
	}
	.CheckListEditPage .items p.shrunk {
		height: 0rem;
		padding: 0rem;
		overflow: hidden;
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
