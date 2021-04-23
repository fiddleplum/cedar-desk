import { ShowHide, FormHelper, DragList } from 'elm-app';
import { Page } from 'page';
import { CheckListListData } from 'types/check-list';

export class CheckListPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Check-Lists');

		// Get the tasks.
		this.app.ws.send({
			module: 'check-list',
			command: 'listCheckLists'
		}).then((checkListListData: CheckListListData) => {
			let html = '<DragList onReinsert="_checkListListReinserted">';
			for (const checkListList of checkListListData) {
				html += `
					<p id="${checkListList.id}">
						<button class="grab icon"><icon src="assets/icons/grab.svg" alt="grab"></icon></button>
						<button class="list">${checkListList.title}</button>
						<button class="delete icon"><icon src="assets/icons/close.svg" alt="delete"></icon></button>
					</p>`;
			}
			html += '</DragList>';
			const checkListsElem = this.element('check-lists', Element);
			this.insertHtml(checkListsElem, null, html, this);
		});

		this.app.ws.send({
			module: 'users',
			command: 'listUsers'
		}).then((users: string[]) => {
			const usersElem = this.root.querySelector('#users') as Element;
			let html = '';
			for (const user of users) {
				if (user !== this.app.user) {
					html += `<ElmCheckBox name="user-${user}">${user}</ElmCheckBox>`;
				}
			}
			this.insertHtml(usersElem, null, html, this);
		});
	}

	private _checkListListReinserted(_dragList: DragList, elem: HTMLElement, before: HTMLElement | undefined): void {
		this.app.ws.send({
			module: 'check-list',
			command: 'reinsertCheckList',
			params: {
				id: elem.id,
				beforeId: before?.id
			}
		});
	}

	private _openAddCheckListForm(): void {
		ShowHide.show(this.element('add-check-list-panel', HTMLDivElement));
	}

	private _closeAddCheckListForm(): void {
		ShowHide.hide(this.element('add-check-list-panel', HTMLDivElement));
	}

	private _showEditCheckListButtons(): void {
		const grabButtons = this.root.querySelectorAll('.grab') as NodeListOf<HTMLButtonElement>;
		for (const button of grabButtons) {
			button.style.display = button.style.display === 'block' ? 'none' : 'block';
		}
		const deleteButtons = this.root.querySelectorAll('.delete') as NodeListOf<HTMLButtonElement>;
		for (const button of deleteButtons) {
			button.style.display = button.style.display === 'block' ? 'none' : 'block';
		}
	}

	private _addCheckList(): void {
		const values = FormHelper.getValues(this.element('add-check-list-panel', Element));
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
		}).then((id: string) => {
			// Push router to include check list id.
			this.app.router.pushQuery({
				list: id
			}, true);
			// A router query with a check list name should automatically
			//   open up the check list (checking if the user is properly shared).
		});
	}
}

CheckListPage.html = /* html */`
	<div>
		<div id="check-lists"></div>
		<div id="toolbar">
			<button onclick="_showEditCheckListButtons"><icon src="assets/icons/wrench.svg" alt="Edit check lists"></icon></button>
			<button onclick="_openAddCheckListForm"><icon src="assets/icons/plus.svg" alt="Add check list"></icon></button>
		</div>
		<div id="add-check-list-panel" class="panel" style="display: none;">
			<button class="close icon" onclick="_closeAddCheckListForm"><icon src="assets/icons/close.svg" alt="Close"></icon></button>
			<h1>Make a New Check-List</h1>
			<p>Enter the title of the check-list.</p>
			<p><input name="title" type="text" value="" width="10rem" class="input"></input></p>
			<p>Who do you want to share it with?</p>
			<p id="users" class="input"></p>
			<button class="fullWidth submit" onclick="_addCheckList">Create</button>
		</div>
	</div>
	`;

CheckListPage.css = /* css */`
	.CheckListPage {
		display: grid;
		grid-template-rows: 1fr 2.5rem;
		height: 100%;
	}
	.CheckListPage > #check-lists {
		overflow-y: auto;
		padding: .5rem;
	}
	.CheckListPage > #check-lists p {
		margin-bottom: .5rem;
		text-align: center;
		line-height: 2rem;
	}
	.CheckListPage > #check-lists p > button.list {
		height: 2rem;
	}
	.CheckListPage > #check-lists p > button.grab {
		float: left;
		display: none;
	}
	.CheckListPage > #check-lists p > button.delete {
		float: right;
		display: none;
	}
	.CheckListPage > #toolbar {
		background: var(--color1);
		color: var(--color4);
		fill: var(--color4);
		text-align: right;
		padding: .25rem;
	}
	.CheckListPage > #toolbar button {
		margin-right: .25rem;
		width: 2rem;
		height: 2rem;
		padding: 0;
	}
	.CheckListPage > #toolbar button:last-child {
		margin-right: 0;
	}
	.CheckListPage > #toolbar button:active {
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
