import { Page } from 'page';
import { SunAlarm } from '../types/sun-alarm';

export class SunAlarmPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Sun Alarm');

		// Get the alarms.
		this.app.ws.send({
			module: 'sun-alarm',
			command: 'list'
		}).then((sunAlarmList: { [id: string]: SunAlarm }) => {
			let html = ``;
			for (const id in sunAlarmList) {
				const sunAlarm = sunAlarmList[id];
				html += `
					<div id="${id}">
						<p id="desc-${id}" class="${!sunAlarm.enabled ? 'disabled' : ''}">
						Sound the <em>${sunAlarm.sound}</em> alarm ${Math.floor(Math.abs(sunAlarm.timeOffset) / 60)} hours
						and ${Math.abs(sunAlarm.timeOffset) % 60} minutes ${sunAlarm.timeOffset < 0 ? 'before' : 'after'}
						the time when the sun is ${Math.abs(sunAlarm.angleOffset)} ${sunAlarm.angleOffset < 0 ? 'below' : 'above'}
						the ${sunAlarm.relativeTo} horizon on ${this._getDaysString(sunAlarm.days)}.</p>
						<p>
							<button id="enabled-${id}" onclick="_toggleEnabled">${sunAlarm.enabled ? 'Disable' : 'Enable'}</button>
							<button id="edit-${id}" onclick="_goToEditPage">Edit</button>
							<button id="remove-${id}" onclick="_removeAlarm">Remove</button>
						</p>
					</div>
					`;
			}
			this.insertHtml(this.element('list', Element), null, html);
		});
	}

	private _getDaysString(days: boolean[]): string {
		if (days[0] && days[1] && days[2] && days[3] && days[4] && !days[5] && !days[6]) {
			return 'weekdays';
		}
		else if (!days[0] && !days[1] && !days[2] && !days[3] && !days[4] && days[5] && days[6]) {
			return 'weekends';
		}
		else {
			let s = '';
			let count = 0;
			for (let i = 0; i < 7; i++) {
				if (days[i]) {
					if (s !== '') {
						s += ', ';
					}
					s += this.days[i];
					count += 1;
				}
			}
			if (count === 7) {
				s = 'every day';
			}
			if (count > 2) {
				s = s.replace(/,([^,]+)$/, ', and$1');
			}
			else if (count > 1) {
				s = s.replace(/,([^,]+)$/, ' and$1');
			}
			else if (count === 0) {
				s = 'no days';
			}
			return s;
		}
	}

	private _toggleEnabled(event: Event): void {
		const buttonElem = event.target as HTMLButtonElement;
		const id = buttonElem.id.substring('enabled-'.length);
		const descElem = this.element(`desc-${id}`, HTMLParagraphElement);
		const disabled = descElem.classList.contains('disabled');
		this.app.ws.send({
			module: 'sun-alarm',
			command: 'set-enabled',
			params: {
				id: id,
				enabled: disabled // this toggles it.
			}
		}).then(() => {
			if (disabled) {
				descElem.classList.remove('disabled');
				buttonElem.innerHTML = 'Disable';
			}
			else {
				descElem.classList.add('disabled');
				buttonElem.innerHTML = 'Enable';
			}
		});
	}

	private _goToAddPage(): void {
		this.app.router.pushQuery({
			page: 'sun-alarm-add-edit'
		});
	}

	private _goToEditPage(event: Event): void {
		const buttonElem = event.target as HTMLButtonElement;
		const id = buttonElem.id.substring('edit-'.length);
		this.app.router.pushQuery({
			page: 'sun-alarm-add-edit',
			id: id
		});
	}

	private _removeAlarm(event: Event): void {
		const buttonElem = event.target as HTMLButtonElement;
		const id = buttonElem.id.substring('remove-'.length);
		if (!confirm('Are you sure you want to remove the alarm?')) {
			return;
		}
		this.app.ws.send({
			module: 'sun-alarm',
			command: 'remove',
			params: {
				id: id
			}
		}).then(() => {
			this.removeElement(this.element(id, Element));
		});
	}

	/** A number to day of week string mapping. */
	private days: string[] = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
}

SunAlarmPage.html = /* html */`
	<div>
		<button onclick="_goToAddPage" class="fullwidth">Add Alarm</button>
		<div id="list">
		</div>
	</div>
	`;

SunAlarmPage.css = /* css */`
	.SunAlarmPage {
		margin: 0 auto;
		width: 100%;
		max-width: 20rem;
	}
	.SunAlarmPage > #list > div {
		margin-top: .25rem;
		border-radius: .25rem;
		border: 1px solid var(--color1);
		background: var(--color5);
		padding: .25rem;
	}
	.SunAlarmPage > #list > div > p[id^='desc-'].disabled {
		color: var(--color3);
	}
	.SunAlarmPage > #list > div > p > button {
		margin-right: .25rem;
		width: 5rem;
		background: var(--color4);
	]
`;

SunAlarmPage.register();
