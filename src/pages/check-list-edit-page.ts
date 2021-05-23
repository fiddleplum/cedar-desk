import { ShowHide, ElmForm, DragList, Cookies } from 'elm-app';
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
			return;
		}
		this._checkListId = id;

		// Get the checklist data.
		this.app.ws.send({
			module: 'check-list',
			command: 'getCheckList',
			params: {
				id: this._checkListId
			}
		}).catch(() => {
			this.query('.title', HTMLElement)!.innerHTML = 'Check-list Not Found';
		}).then((checkListData: CheckListData) => {
			// Set the title.
			this.query('.title', HTMLElement)!.innerHTML = checkListData.title;
			// Set the remove-on-check flag.
			this._removeOnCheck = checkListData.removeOnCheck;
			// Set the drag list.
			let html = '<DragList id="list" onAfterGrab="_onItemAfterGrab" onAfterDrag="_onItemAfterDrag" onAfterRelease="_onItemAfterRelease">';
			if (checkListData.items.length !== 0) {
				for (const item of checkListData.items) {
					html += /* html */`
						<p class="${item.checked ? 'checked' : ''}" data-id="${item.id}" data-level="${item.level}" style="margin-left: ${item.level}rem">
							<button class="button grab svg" tabindex="-1"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
							<label class="checkbox button svg"><input name="checked" type="checkbox" ${item.checked ? 'checked' : ''} onchange="_onChecked" /><icon src="assets/icons/check.svg" alt="check"></icon></label>
							<span class="textarea-grower" data-replicated-value="${item.text}">
								<textarea rows=1 class="input text" name="text" onkeydown="_onKeyDown" oninput="_onInput" onfocus="_onFocus">${item.text}</textarea>
							</span>
							<button class="button remove svg" onclick="_removeButtonPressed"><icon src="assets/icons/close.svg" alt="remove item"></icon></button>
						</p>`;
				}
			}
			else {
				html += /* html */`
					<p data-id="NEW" data-level="0" style="margin-left: 0rem">
						<button class="button grab svg" tabindex="-1"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
						<label class="checkbox button svg"><input name="checked" type="checkbox" onchange="_onChecked" /><icon src="assets/icons/check.svg" alt="check"></icon></label>
						<span class="textarea-grower" data-replicated-value="">
							<textarea rows=1 class="input text" name="text" onkeydown="_onKeyDown" oninput="_onInput" onfocus="_onFocus"></textarea>
						</span>
						<button class="button remove svg" onclick="_removeButtonPressed"><icon src="assets/icons/close.svg" alt="remove item"></icon></button>
					</p>`;
			}
			html += `</DragList>`;
			this.setHtml(html, this.query('.items', Element)!, this);
			// Save the new element if it's the only new one.
			if (checkListData.items.length === 0) {
				const newElem = this.query('[data-id="NEW"]', HTMLElement)!;
				this._sendAddItemCommand(newElem);
			}
			// Register as a websocket handler.
			this.app.ws.registerHandler('check-list', this._responseHandler.bind(this));
			// Let the server know we want to receive check-list updates.
			this.app.ws.send({
				module: 'check-list',
				command: 'onCheckList',
				params: {
					checkListId: this._checkListId
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
				checkListId: this._checkListId
			}
		});
		window.clearInterval(this._intervalId);
		super.destroy();
	}

	/** Called just after an item will be dragged. */
	private _onItemAfterGrab(_dragList: DragList, _event: string, elem: HTMLElement, beforeElem: HTMLElement | undefined, event: MouseEvent | TouchEvent): void {
		// Shrink the "child" items below the elem.
		this._draggedOrigLevel = Number.parseInt(elem.getAttribute('data-level')!);
		let nextElem = beforeElem;
		this._childrenOfDraggedElem = [];
		while (nextElem !== undefined) {
			const nextElemLevel = Number.parseInt(nextElem.getAttribute('data-level')!);
			if (nextElemLevel >= this._draggedOrigLevel + 1) {
				this._childrenOfDraggedElem.push(nextElem);
			}
			else {
				break;
			}
			nextElem = nextElem.nextElementSibling as HTMLElement | null ?? undefined;
		}
		// Get the x value of the cursor.
		this._refX = this._getX(event);
		// Make the children of the dragged elem shrunk.
		if (this._childrenOfDraggedElem.length > 0) {
			for (const child of this._childrenOfDraggedElem) {
				const childBounds = child.getBoundingClientRect();
				child.style.height = `${childBounds.height}px`;
				child.dataset.height = `${childBounds.height}px`;
				child.classList.add('dragged');
				// Add the shrunk class. In a setTimeout to enable transitions.
				setTimeout(() => {
					child.style.height = '0';
					child.style.padding = '0';
					child.style.overflow = 'hidden';
				}, 0);
			}
		}
	}

	/** Called just after a drag. */
	private _onItemAfterDrag(_dragList: DragList, _event: string, elem: HTMLElement, event: MouseEvent | TouchEvent, beforeElem: HTMLElement | undefined): void {
		// Get the previous element of where the element would be placed.
		let prevElem: HTMLElement | undefined;
		if (beforeElem !== undefined) {
			prevElem = beforeElem.previousElementSibling as HTMLElement | null ?? undefined;
		}
		else {
			prevElem = elem.parentElement!.parentElement!.lastElementChild!.lastElementChild as HTMLElement | null ?? undefined;
		}
		while (prevElem !== undefined && this._childrenOfDraggedElem.includes(prevElem)) {
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
		const beforeElemLevel = beforeElem !== undefined ? parseInt(beforeElem.getAttribute('data-level')!) : -1;
		while (elemLevel < beforeElemLevel - 1) {
			this._shiftItem(elem, prevElem, true, +1);
			elemLevel += 1;
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
	private _onItemAfterRelease(_dragList: DragList, _event: string, elem: HTMLElement, beforeElem: HTMLElement | undefined): void {
		// The before elem may be one of the child shrunk elements, so find the first one that's not.
		while (beforeElem !== undefined && this._childrenOfDraggedElem.includes(beforeElem)) {
			beforeElem = (beforeElem.nextElementSibling as HTMLElement | null) ?? undefined;
		}
		// Reinsert the shrunk elems to be after the drag element.
		for (const child of this._childrenOfDraggedElem) {
			elem.parentElement!.insertBefore(child, beforeElem ?? null);
			child.classList.remove('dragged');
		}
		if (this._childrenOfDraggedElem.length > 0) {
			this._childrenOfDraggedElem[0].style.marginTop = `0px`;
		}
		// Remove the shrunk properties. Use timeout so the transition happens.
		setTimeout(((childrenOfDraggedElem: HTMLElement[]): void => {
			for (const child of childrenOfDraggedElem) {
				child.style.height = child.dataset.height!;
				child.style.padding = '';
				child.style.overflow = '';
			}
		}).bind(undefined, this._childrenOfDraggedElem), 100);
		// Change height back to auto once the transition is done.
		setTimeout(((childrenOfDraggedElem: HTMLElement[]): void => {
			for (const child of childrenOfDraggedElem) {
				child.style.height = '';
			}
		}).bind(undefined, this._childrenOfDraggedElem), 350);
		// Clean up the shrunk elements.
		this._childrenOfDraggedElem = [];
		// Send the update level command.
		this._sendUpdateLevelCommand(elem);
		// Send the reinsert item command.
		this._sendReinsertItemCommand(elem, beforeElem);
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
		const checkedInputElem = elem.querySelector('[name="checked"]') as HTMLInputElement;
		const textInputElem = elem.querySelector('[name="text"]') as HTMLTextAreaElement;
		const checked = checkedInputElem.checked;
		const text = textInputElem.value;
		const level = parseInt(elem.getAttribute('data-level')!);
		const beforeElem = elem.nextElementSibling;
		const beforeId = beforeElem !== null ? beforeElem.getAttribute('data-id')! : undefined;
		this.app.ws.send({
			module: 'check-list',
			command: 'addItem',
			params: {
				checkListId: this._checkListId,
				checked: checked,
				text: text,
				level: level,
				beforeId: beforeId
			}
		}).then((id: string) => {
			elem.setAttribute('data-id', id);
		});
	}

	/** Sends an updateChecked command. */
	private _sendUpdateCheckedCommand(elem: Element): void {
		const checkedInputElem = elem.querySelector('[name="checked"]') as HTMLInputElement;
		const id = elem.getAttribute('data-id')!;
		const checked = checkedInputElem.checked;
		this.app.ws.send({
			module: 'check-list',
			command: 'updateChecked',
			params: {
				checkListId: this._checkListId,
				id: id,
				checked: checked
			}
		});
		// Remove it from the changed inputs, since it has just been saved.
		this._changedElems.delete(elem);
	}

	/** Sends an updateText command. */
	private _sendUpdateTextCommand(elem: Element): void {
		const textInputElem = elem.querySelector('[name="text"]') as HTMLTextAreaElement;
		const id = elem.getAttribute('data-id')!;
		const text = textInputElem.value;
		this.app.ws.send({
			module: 'check-list',
			command: 'updateText',
			params: {
				checkListId: this._checkListId,
				id: id,
				text: text
			}
		});
		// Remove it from the changed inputs, since it has just been saved.
		this._changedElems.delete(elem);
	}

	/** Sends an update level command. */
	private _sendUpdateLevelCommand(elem: Element): void {
		const id = elem.getAttribute('data-id')!;
		const level = parseInt(elem.getAttribute('data-level')!);
		this.app.ws.send({
			module: 'check-list',
			command: 'updateLevel',
			params: {
				checkListId: this._checkListId,
				id: id,
				level: level
			}
		});
	}

	/** Sends a remove item command. */
	private _sendRemoveItemCommand(elem: Element): void {
		const id = elem.getAttribute('data-id')!;
		this.app.ws.send({
			module: 'check-list',
			command: 'removeItem',
			params: {
				checkListId: this._checkListId,
				id: id
			}
		});
	}

	/** Sends a reinsert item command. */
	private _sendReinsertItemCommand(elem: Element, beforeElem: Element | undefined): void {
		const id = elem.getAttribute('data-id')!;
		this.app.ws.send({
			module: 'check-list',
			command: 'reinsertItem',
			params: {
				checkListId: this._checkListId,
				id: id,
				beforeId: beforeElem?.getAttribute('data-id') ?? undefined
			}
		});
	}

	/** When a key was pressed while focused on one of the items. */
	private _onKeyDown(event: KeyboardEvent): void {
		// Get the relative item and its input.
		const textAreaElem = event.target as HTMLTextAreaElement;
		const itemElem = textAreaElem.parentElement!.parentElement as HTMLParagraphElement;
		// Android keyboards don't report the correct keys for when enter is pressed, so check if there's an enter in the input.
		if (event.key === 'Enter' || textAreaElem.value.includes('\n')) {
			this._processEnterKey(itemElem);
			// Prevent the actual enter from happening.
			event.preventDefault();
		}
		else if (event.key === 'Backspace' || event.key === 'Delete') {
			// If it is already blank,
			if (event.key === 'Backspace'
					&& textAreaElem.selectionStart === 0 && textAreaElem.selectionEnd === 0
					&& itemElem.previousElementSibling !== null) {
				this._processBackspaceKey(itemElem);
				// Make the event not do an actual backspace.
				event.preventDefault();
			}
			else if (event.key === 'Delete'
					&& textAreaElem.selectionStart === textAreaElem.value.length && textAreaElem.selectionEnd === textAreaElem.value.length
					&& itemElem.nextElementSibling !== null) {
				this._processDeleteKey(itemElem);
				// Make the event not do an actual backspace.
				event.preventDefault();
			}
		}
		else if (event.key === '[' && event.ctrlKey) {
			const changed = this._shiftItem(itemElem, itemElem.previousElementSibling as HTMLElement | null ?? undefined, true, -1);
			if (changed !== 0) {
				this._sendUpdateLevelCommand(itemElem);
			}
		}
		else if (event.key === ']' && event.ctrlKey) {
			const changed = this._shiftItem(itemElem, itemElem.previousElementSibling as HTMLElement | null ?? undefined, true, +1);
			if (changed !== 0) {
				this._sendUpdateLevelCommand(itemElem);
			}
		}
	}

	private _processEnterKey(itemElem: HTMLElement): void {
		const textAreaElem = itemElem.querySelector('textarea') as HTMLTextAreaElement;
		// Create new item below this one at the same level.
		const dragList = this.component('list', DragList);
		const itemLevel = itemElem.getAttribute('data-level');
		const html = /* html */`
			<p data-id="NEW" data-level="${itemLevel}" style="margin-left: ${itemLevel}rem">
				<button class="button grab svg" tabindex="-1"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
				<label class="checkbox button svg"><input name="checked" type="checkbox" onchange="_onChecked" /><icon src="assets/icons/check.svg" alt="check"></icon></label>
				<span class="textarea-grower" data-replicated-value="">
					<textarea rows=1 class="input text" name="text" onkeydown="_onKeyDown" oninput="_onInput" onfocus="_onFocus"></textarea>
				</span>
				<button class="button remove svg" onclick="_removeButtonPressed"><icon src="assets/icons/close.svg" alt="remove item"></icon></button>
			</p>`;
		dragList.insertItems(html, itemElem.nextElementSibling ? itemElem.nextElementSibling as HTMLElement : undefined);
		// Add any text to the right of the cursor, to the new input.
		const newItemElem = itemElem.nextElementSibling as HTMLElement;
		const newTextAreaElem = newItemElem.querySelector('[name="text"]') as HTMLTextAreaElement;
		newTextAreaElem.value = textAreaElem.value.substring(textAreaElem.selectionEnd);
		// Remove any text to the right of the cursor from the old input.
		textAreaElem.value = textAreaElem.value.substring(0, textAreaElem.selectionStart);
		// Save both items.
		this._sendUpdateTextCommand(itemElem);
		this._sendAddItemCommand(newItemElem);
		// Move focus to new item.
		newTextAreaElem.focus();
		newTextAreaElem.setSelectionRange(0, 0);
	}

	private _processBackspaceKey(itemElem: HTMLElement): void {
		const textAreaElem = itemElem.querySelector('textarea') as HTMLTextAreaElement;
		// Append any text in the input to the prev item.
		const prevItemElem = itemElem.previousElementSibling as HTMLElement;
		const prevTextAreaElem = prevItemElem.querySelector('[name="text"]') as HTMLTextAreaElement;
		const prevTextAreaElemLength = prevTextAreaElem.value.length;
		prevTextAreaElem.value = prevTextAreaElem.value + textAreaElem.value;
		// Update the prev item.
		this._sendUpdateTextCommand(prevItemElem);
		// Focus on the end of the previous item.
		prevTextAreaElem.focus();
		prevTextAreaElem.setSelectionRange(prevTextAreaElemLength, prevTextAreaElemLength);
		// Send the remove item command.
		this._sendRemoveItemCommand(itemElem);
		// Remove the item from the list.
		const dragList = this.component('list', DragList);
		dragList.removeItem(itemElem);
	}

	private _processDeleteKey(itemElem: HTMLElement): void {
		const textAreaElem = itemElem.querySelector('textarea') as HTMLTextAreaElement;
		// Prepend any text in the input to the next item.
		const nextItemElem = itemElem.nextElementSibling as HTMLElement;
		const nextTextAreaElem = nextItemElem.querySelector('[name="text"]') as HTMLTextAreaElement;
		nextTextAreaElem.value = textAreaElem.value + nextTextAreaElem.value;
		// Focus on the end of the next item.
		nextTextAreaElem.focus();
		nextTextAreaElem.setSelectionRange(textAreaElem.value.length, textAreaElem.value.length);
		// Update the next item.
		this._sendUpdateTextCommand(nextItemElem);
		// Send the remove item command.
		this._sendRemoveItemCommand(itemElem);
		// Remove the item from the list.
		const dragList = this.component('list', DragList);
		dragList.removeItem(itemElem);
	}

	/** Called when the remove button is pressed. */
	private _removeButtonPressed(event: InputEvent): void {
		console.log(event);
		this._removeItem((event.target as HTMLElement).parentElement!, true);
	}

	/** Opens the popup. */
	private _openPopup(): void {
		this.query('.popup', HTMLElement)!.classList.add('opened');
	}

	/** Closes the popup. */
	private _closePopup(): void {
		this.query('.popup', HTMLElement)!.classList.remove('opened');
	}

	private _popupYesButtonPressed(): void {
		this.query('.popup', HTMLElement)!.classList.remove('opened');
		this._removeItem(this._itemToRemove!, false);
	}

	/** Removes an item. Checks with user if there is more than one item. */
	private _removeItem(itemElem: HTMLElement, doPopup: boolean): void {
		// Get the list of items to remove.
		const elemsToRemove = [itemElem];
		const level = parseInt(itemElem.getAttribute('data-level')!);
		let nextElem = itemElem.nextElementSibling as HTMLElement | null ?? undefined;
		while (nextElem !== undefined) {
			const childLevel = parseInt(nextElem.getAttribute('data-level')!);
			// It's not a child, so finish.
			if (childLevel <= level) {
				break;
			}
			elemsToRemove.push(nextElem);
			nextElem = nextElem.nextElementSibling as HTMLElement | null ?? undefined;
		}
		// If there are more than one, do a popup.
		if (elemsToRemove.length > 1 && doPopup) {
			this._itemToRemove = itemElem;
			this._openPopup();
		}
		else {
			// Do the removing.
			for (const elemToRemove of elemsToRemove) {
				console.log(elemToRemove);
				this._sendRemoveItemCommand(elemToRemove);
				elemToRemove.parentElement!.removeChild(elemToRemove);
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
				if (this._childrenOfDraggedElem.length > 0) {
					for (let i = 0; i < this._childrenOfDraggedElem.length; i++) {
						const childElem = this._childrenOfDraggedElem[i];
						const newChildLevel = parseInt(childElem.getAttribute('data-level')!) + newLevel - level;
						childElem.setAttribute('data-level', `${newChildLevel}`);
						childElem.style.marginLeft = `${newChildLevel}rem`;
					}
				}
				else {
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
			}
			return newLevel - level;
		}
		return 0;
	}

	/** When one of the items text values have changed. */
	private _onInput(event: InputEvent): void {
		const textAreaElem = event.target as HTMLTextAreaElement;
		// Check for an enter pressed.
		// Needed here and not in keydown because Android keyboard doesn't send a proper enter event.
		if (textAreaElem.value.includes('\n')) {
			const selectionStart = textAreaElem.selectionStart - 1;
			textAreaElem.value = textAreaElem.value.replace('\n', '');
			textAreaElem.selectionStart = textAreaElem.selectionEnd = selectionStart;
			this._processEnterKey(textAreaElem.parentElement!.parentElement!);
		}
		// Update the changed items list.
		this._changedElems.add(textAreaElem.parentElement!.parentElement!);
		// Make sure the replicated-value is updated so that the other div's height is set.
		(textAreaElem.parentNode as HTMLElement).dataset.replicatedValue = textAreaElem.value;
	}

	/** When the text area goes into focus. */
	private _onFocus(event: FocusEvent): void {
		const textAreaElem = event.target as HTMLTextAreaElement;
		if (this._currentFocus !== undefined) {
			this._currentFocus.parentElement!.parentElement!.classList.remove('focused');
		}
		this._currentFocus = textAreaElem;
		if (this._currentFocus !== undefined) {
			this._currentFocus.parentElement!.parentElement!.classList.add('focused');
		}
	}

	/** When one of the items is checked. */
	private _onChecked(event: InputEvent): void {
		const checkedInputElem = event.target as HTMLInputElement;
		const elem = checkedInputElem.parentElement!.parentElement!;
		if (this._removeOnCheck) {
			// Don't actually check the item.
			checkedInputElem.checked = false;
			// Just remove it.
			this._removeItem(elem, true);
		}
		else {
			// Check the item.
			elem.classList.toggle('checked', checkedInputElem.checked);
			// Check the children too.
			const level = parseInt(elem.getAttribute('data-level')!);
			let nextElem = elem.nextElementSibling as HTMLElement | null ?? undefined;
			while (nextElem !== undefined) {
				const childLevel = parseInt(nextElem.getAttribute('data-level')!);
				// It's not a child, so finish.
				if (childLevel <= level) {
					break;
				}
				nextElem.classList.toggle('checked', checkedInputElem.checked);
				(nextElem.querySelector('[name="checked"]') as HTMLInputElement).checked = checkedInputElem.checked;
				nextElem = nextElem.nextElementSibling as HTMLElement | null ?? undefined;
			}
			this._sendUpdateCheckedCommand(elem);
		}
	}

	/** When a command is received from the server. */
	private _responseHandler(response: JSONObject): void {
		const command = response.command;
		const dragList = this.component('list', DragList);
		if (command === 'addItem') {
			const id = response.id as string;
			const checked = response.checked as boolean;
			const text = response.text as string;
			const level = response.level as number;
			const beforeId = response.beforeId as string | undefined;
			// Get the beforeElem.
			const beforeElem = beforeId !== undefined ? this.query(`[data-id="${beforeId}"]`, HTMLElement) : undefined;
			// Create new item below this one at the same level.
			const html = /* html */`
				<p class="${checked ? 'checked' : ''}" data-id="${id}" data-level="${level}" style="margin-left: ${level}rem">
					<button class="button grab svg" tabindex="-1"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
					<label class="checkbox button svg"><input name="checked" type="checkbox" onchange="_onChecked" ${checked ? 'checked' : ''}/><icon src="assets/icons/check.svg" alt="check"></icon></label>
					<span class="textarea-grower" data-replicated-value="${text}">
						<textarea rows=1 class="input text" name="text" onkeydown="_onKeyDown" oninput="_onInput" onfocus="_onFocus">${text}</textarea>
					</span>
					<button class="button remove svg" onclick="_removeButtonPressed"><icon src="assets/icons/close.svg" alt="remove item"></icon></button>
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
		else if (command === 'updateChecked') {
			const id = response.id as string;
			const checked = response.checked as boolean;
			const elem = this.query(`[data-id="${id}"]`, HTMLElement);
			if (elem === undefined) {
				return;
			}
			if (this._removeOnCheck) {
				const elemsToRemove = [elem];
				// Remove the children too.
				const level = parseInt(elem.getAttribute('data-level')!);
				let nextElem = elem.nextElementSibling as HTMLElement | null ?? undefined;
				while (nextElem !== undefined) {
					const childLevel = parseInt(nextElem.getAttribute('data-level')!);
					// It's not a child, so finish.
					if (childLevel <= level) {
						break;
					}
					elemsToRemove.push(nextElem);
					nextElem = nextElem.nextElementSibling as HTMLElement | null ?? undefined;
				}
				for (const elemToRemove of elemsToRemove) {
					elemToRemove.parentElement!.removeChild(elemToRemove);
				}
			}
			else {
				const checkedInputElem = elem.querySelector('[name="checked"]') as HTMLInputElement;
				checkedInputElem.checked = checked;
				elem.classList.toggle('checked', checkedInputElem.checked);
				// Check the children too.
				const level = parseInt(elem.getAttribute('data-level')!);
				let nextElem = elem.nextElementSibling as HTMLElement | null ?? undefined;
				while (nextElem !== undefined) {
					const childLevel = parseInt(nextElem.getAttribute('data-level')!);
					// It's not a child, so finish.
					if (childLevel <= level) {
						break;
					}
					nextElem.classList.toggle('checked', checkedInputElem.checked);
					(nextElem.querySelector('[name="checked"]') as HTMLInputElement).checked = checkedInputElem.checked;
					nextElem = nextElem.nextElementSibling as HTMLElement | null ?? undefined;
				}
			}
		}
		else if (command === 'updateText') {
			const id = response.id as string;
			const text = response.text as string;
			const elem = this.query(`[data-id="${id}"] [name="text"]`, HTMLTextAreaElement);
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
				id: this._checkListId
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
		// Populate the users.
		const form = this.component('edit-check-list-form', ElmForm);
		const thisUser = Cookies.get('user');
		for (const user of users) {
			if (this.query(`input[name="user-${user}"]`, HTMLElement) === undefined && user !== thisUser) {
				form.insertEntries(`<entry name="user-${user}" type="toggle">${user}</entry>`, 'submit');
			}
		}
		// Populate the values.
		const values = new Map<string, string | boolean>();
		values.set('title', checkListData.title);
		values.set('removeOnCheck', checkListData.removeOnCheck ? 'yes' : 'no');
		for (const user of checkListData.users) {
			if (user !== thisUser) {
				values.set(`user-${user}`, true);
			}
		}
		form.setValues(values);
	}

	/** Closes a panel. */
	private _closePanel(className: string): void {
		ShowHide.hide(this.query(`.${className}`, HTMLElement)!);
	}

	/** Sends the command to edit the check-list properties. */
	private async _editCheckList(): Promise<void> {
		// Get the inputs.
		const form = this.component('edit-check-list-form', ElmForm);
		const id = this._checkListId;
		const values = form.getValues();
		const title = values.get('title') as string;
		const removeOnCheck = values.get('removeOnCheck') as string;
		const users: string[] = [];
		for (const [name, value] of values) {
			if (name.startsWith('user-') && value === true) {
				users.push(name.substring('user-'.length));
			}
		}

		// Clear the message and disable the submit button.
		form.setMessage('');
		form.setEnabled(false);

		try {
			// Send the command.
			await this.app.ws.send({
				module: 'check-list',
				command: 'editCheckList',
				params: {
					id: id,
					title: title,
					removeOnCheck: removeOnCheck === 'yes',
					users: users
				}
			});

			// Go back to the same page, ensuring that the check-list properties have changed.
			this.app.router.pushQuery({}, true);
		}
		catch (error) {
			form.setMessage((error as Error).message + '');
		}
		form.setEnabled(true);
	}

	/** The check-list id. */
	private _checkListId: string = '';

	/** The list of items currently shrunk. */
	private _childrenOfDraggedElem: HTMLElement[] = [];

	/** The original level of the dragged item. */
	private _draggedOrigLevel: number = 0;

	/** The interval id for updating changed items. */
	private _intervalId!: number;

	/** The set of changed items. */
	private _changedElems: Set<Element> = new Set();

	/** The initial x-value of the dragged item. */
	private _refX: number = 0;

	/** Flag if items should be removed when checked. */
	private _removeOnCheck: boolean = false;

	/** The currently focused text area. */
	private _currentFocus: HTMLTextAreaElement | undefined;

	/** The current item being checked in the popup. */
	private _itemToRemove: HTMLElement | undefined;
}

CheckListEditPage.html = /* html */`
	<div>
		<h1 class="title"></h1>
		<div class="items"></div>
		<div class="toolbar">
			<button class="button left svg" onclick="_goToCheckListListPage"><icon src="assets/icons/arrow-left.svg" alt="View check lists"></icon></button>
			<button class="button right svg" onclick="_openEditCheckListPanel"><icon src="assets/icons/wrench.svg" alt="Edit check list"></icon></button>
		</div>
		<div class="check-remove-popup popup">
			<p>Are you sure you want to remove these?</p>
			<p class="buttons">
				<button class="button" onclick="_closePopup">No</button>
				<button class="button" onclick="_popupYesButtonPressed">Yes</button>
			</p>
		</div>
		<div class="edit-check-list-panel panel" style="display: none;">
			<button class="button close svg" onclick="_closePanel|edit-check-list-panel"><icon src="assets/icons/close.svg" alt="Close"></icon></button>
			<h1>Edit Check-List</h1>
			<ElmForm id="edit-check-list-form">
				<entry name="title" type="text" width="10rem">Title</entry>
				<p>Should checking an item remove it?</p>
				<entry name="removeOnCheck" type="choice">
					<choice value="no">No</choice>
					<choice value="yes">Yes</choice>
				</entry>
				<p>Shared Users</p>
				<entry name="submit" type="submit" action="_editCheckList">Save Changes</entry>
			</ElmForm>
		</div>
	</div>
	`;

CheckListEditPage.css = /* css */`
	.CheckListEditPage {
		display: grid;
		grid-template-rows: 2.5rem 1fr 2.5rem;
		height: 100%;
	}
	.CheckListEditPage .title {
		margin: 0;
		padding: .5rem 0;
		background: var(--color4);
		text-align: center;
	}
	.CheckListEditPage > .items {
		overflow-y: auto;
		padding: .25rem;
		height: 100%;
	}
	.CheckListEditPage > .items .DragList p {
		transition: height .25s, transform .25s, margin-left .25s, padding .25s, opacity .25s;
	}
	.CheckListEditPage > .items p {
		margin: 0;
		padding: 0 0 .25rem 0;
	}
	.CheckListEditPage .grab, .CheckListEditPage .checkbox, .CheckListEditPage .remove {
		display: inline-block;
		width: 1.5rem;
		height: 1.5rem;
		vertical-align: top;
	}
	.CheckListEditPage .grab, .CheckListEditPage .checkbox {
		margin-right: .25rem;
	}
	.CheckListEditPage label.checkbox svg {
		vertical-align: bottom;
	}
	/* Make checked checkboxes have a check. */
	.CheckListEditPage [name="checked"]:checked ~ svg {
		opacity: 200%;
		transform: scale(1);
	}
	/* Make the checked items a bit more faded. */
	.CheckListEditPage .checked .text {
		opacity: 50%;
	}

	.CheckListEditPage .textarea-grower {
		vertical-align: top;
		width: calc(100% - 3.5rem);
		display: inline-grid;
	}
	.CheckListEditPage p.focused .textarea-grower {
		width: calc(100% - 5.25rem);
	}
	.CheckListEditPage .textarea-grower .text {
		grid-area: 1 / 1 / 2 / 2;
		margin: 0;
		width: 100%;
		resize: none;
		overflow: hidden;
	}
	.CheckListEditPage .textarea-grower::after {
		grid-area: 1 / 1 / 2 / 2;
		content: attr(data-replicated-value) " ";
		white-space: pre-wrap;
		visibility: hidden;
		padding: .25rem;
		line-height: 1rem;
	}

	.CheckListEditPage .remove {
		margin-left: .25rem;
		display: none;
	}
	.CheckListEditPage p.focused .remove {
		display: inline-block;
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
	.CheckListEditPage .popup {
		display: none;
	}
	.CheckListEditPage .popup.opened {
		display: block;
	}
	.CheckListEditPage .popup button + button {
		margin-left: .25rem;
	}
	.CheckListEditPage .popup .buttons {
		text-align: right;
	}
	.CheckListEditPage .panel button.close {
		float: right;
	}
	`;

CheckListEditPage.register();
