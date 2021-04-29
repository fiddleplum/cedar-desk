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
				const hours = Math.floor(Math.abs(sunAlarm.timeOffset) / 60);
				const minutes = Math.abs(sunAlarm.timeOffset) % 60;
				const angle = sunAlarm.angleOffset;
				html += `
					<div class="${id}">
						<p class="desc-${id} ${!sunAlarm.enabled ? 'disabled' : ''}">
						Sound the <em>${sunAlarm.sound}</em> alarm ${hours > 0 ? `${hours} hours ` : ''}
						${hours > 0 && minutes > 0 ? 'and ' : ''} ${minutes > 0 ? `${minutes} minutes ` : ''}
						${sunAlarm.timeOffset < 0 ? 'before' : 'after'}
						${angle !== 0 ? `the sun is ${Math.abs(angle)}° ${angle < 0 ? 'below' : 'above'}
						the ${sunAlarm.relativeTo} horizon` : ` ${sunAlarm.relativeTo}`} on ${this._getDaysString(sunAlarm.days)}.</p>
						<p>
							<button data-id="${id}" onclick="_toggleEnabled">${sunAlarm.enabled ? 'Disable' : 'Enable'}</button>
							<button data-id="${id}" onclick="_goToEditPage">Edit</button>
							<button data-id="${id}" onclick="_removeAlarm">Remove</button>
						</p>
					</div>
					`;
			}
			this.insertHtml(this.query('.list', Element), null, html);
		});

		// // Setup the service worker.
		// const serviceWorkerUrl = 'assets/sun-alarm-service-worker.js';
		// navigator.serviceWorker.register(serviceWorkerUrl).then((registration: ServiceWorkerRegistration) => {
		// 	console.log('Sun Alarm service worker registration was successful.');
		// }).catch((error: Error) => {
		// 	console.log(`Sun Alarm service worker registration failed: ${error}`);
		// });
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
		const id = buttonElem.getAttribute('data-id')!;
		const descElem = this.query(`.desc-${id}`, HTMLParagraphElement);
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
		const id = buttonElem.getAttribute('data-id')!;
		this.app.router.pushQuery({
			page: 'sun-alarm-add-edit',
			id: id
		});
	}

	private _removeAlarm(event: Event): void {
		const buttonElem = event.target as HTMLButtonElement;
		const id = buttonElem.getAttribute('data-id')!;
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
			this.removeNode(this.query(`.${id}`, Element));
		});
	}

	/** A number to day of week string mapping. */
	private days: string[] = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
}

SunAlarmPage.html = /* html */`
	<div>
		<button onclick="_goToAddPage" class="fullwidth">Add Alarm</button>
		<div class="list">
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
		margin-top: .25rem;
		margin-right: .25rem;
		width: 5rem;
		background: var(--color4);
	}
	.SunAlarmPage > #list > div > p > button[id^=edit-] {
		width: 3rem;
	}
`;

SunAlarmPage.register();
