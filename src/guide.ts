import { store } from './store';
import { toast, navigate } from './utils';

export interface GuideStepData {
  title: string;
  target: string;
  peopleText: string;
  endDate: string;
}

let wizardData: GuideStepData = {
  title: '',
  target: '',
  peopleText: '',
  endDate: '',
};

let currentStep = 1;

export function resetWizard() {
  wizardData = {
    title: '',
    target: '',
    peopleText: '',
    endDate: '',
  };
  currentStep = 1;
}

export function renderStepByStepGuideModal(container: HTMLElement, onClose: () => void) {
  function update() {
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-slide-up border border-slate-100">
          
          <!-- Header -->
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div>
              <span class="text-xs font-semibold tracking-wider uppercase text-emerald-700">Quick Guide & Setup</span>
              <h2 class="text-lg font-bold text-slate-900">Create your first record</h2>
            </div>
            <button id="guideCloseBtn" class="text-slate-400 hover:text-slate-600 p-2 rounded-lg -mr-2 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Step Indicators -->
          <div class="px-5 pt-3 pb-2 bg-white border-b border-slate-100">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-semibold text-slate-700">Step ${currentStep} of 4</span>
              <span class="text-xs text-slate-500">${
                currentStep === 1
                  ? 'Name record'
                  : currentStep === 2
                  ? 'Set target'
                  : currentStep === 3
                  ? 'Add people'
                  : 'Review & Finish'
              }</span>
            </div>
            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
              <div class="bg-emerald-600 h-full transition-all duration-300" style="width: ${(currentStep / 4) * 100}%"></div>
            </div>
          </div>

          <!-- Step Content Body -->
          <div class="p-5 overflow-y-auto flex-1">
            ${renderStepBody(currentStep)}
          </div>

          <!-- Footer Buttons -->
          <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            ${
              currentStep > 1
                ? `<button id="guidePrevBtn" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors">
                    Back
                   </button>`
                : `<button id="guideCancelBtn" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors">
                    Cancel
                   </button>`
            }

            ${
              currentStep < 4
                ? `<button id="guideNextBtn" class="ml-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-xs">
                    Next step →
                   </button>`
                : `<button id="guideFinishBtn" class="ml-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-sm flex items-center gap-1.5">
                    Save and start tracking ✓
                   </button>`
            }
          </div>

        </div>
      </div>
    `;

    // Bind Close
    container.querySelector('#guideCloseBtn')?.addEventListener('click', () => {
      onClose();
    });
    container.querySelector('#guideCancelBtn')?.addEventListener('click', () => {
      onClose();
    });

    // Bind Prev
    container.querySelector('#guidePrevBtn')?.addEventListener('click', () => {
      saveStepInputs();
      if (currentStep > 1) {
        currentStep--;
        update();
      }
    });

    // Bind Next
    container.querySelector('#guideNextBtn')?.addEventListener('click', () => {
      saveStepInputs();
      if (currentStep === 1 && !wizardData.title.trim()) {
        toast('Please enter a name for your record.');
        const input = container.querySelector('#wizardTitle') as HTMLInputElement;
        input?.focus();
        return;
      }
      if (currentStep < 4) {
        currentStep++;
        update();
      }
    });

    // Bind Finish
    container.querySelector('#guideFinishBtn')?.addEventListener('click', () => {
      saveStepInputs();
      if (!wizardData.title.trim()) {
        currentStep = 1;
        update();
        toast('Please give your record a name.');
        return;
      }

      // Parse people
      const peopleLines = wizardData.peopleText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const parsedPeople = peopleLines.map((line) => {
        const parts = line.split(',');
        return {
          name: parts[0].trim(),
          phone: parts[1] ? parts[1].trim() : null,
        };
      });

      const newRec = store.createRecord(
        wizardData.title,
        wizardData.target ? Number(wizardData.target) : null,
        wizardData.endDate || null,
        parsedPeople
      );

      toast('Your first record is ready!');
      resetWizard();
      onClose();
      navigate('#/r/' + newRec.id);
    });
  }

  function saveStepInputs() {
    const titleEl = container.querySelector('#wizardTitle') as HTMLInputElement;
    if (titleEl) wizardData.title = titleEl.value;

    const targetEl = container.querySelector('#wizardTarget') as HTMLInputElement;
    if (targetEl) wizardData.target = targetEl.value;

    const peopleEl = container.querySelector('#wizardPeople') as HTMLTextAreaElement;
    if (peopleEl) wizardData.peopleText = peopleEl.value;

    const dateEl = container.querySelector('#wizardDate') as HTMLInputElement;
    if (dateEl) wizardData.endDate = dateEl.value;
  }

  function renderStepBody(step: number): string {
    switch (step) {
      case 1:
        return `
          <div class="space-y-4">
            <div class="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-emerald-950 text-xs leading-relaxed flex gap-2.5">
              <span class="text-base">💡</span>
              <div>
                <strong>Hint:</strong> Think of a record as a notebook page for one event, dues, or group collection.
              </div>
            </div>

            <div>
              <label for="wizardTitle" class="block text-sm font-bold text-slate-800 mb-1">
                What are you collecting for? <span class="text-emerald-700">*</span>
              </label>
              <input
                id="wizardTitle"
                type="text"
                class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder-slate-400"
                placeholder="e.g. Monthly Family Dues, Cake Order, or Excursion"
                value="${escapeHtml(wizardData.title)}"
                autofocus
              />
              <p class="text-xs text-slate-500 mt-1.5">Short hint: Give it a simple name everyone recognizes.</p>
            </div>

            <div class="pt-2">
              <span class="text-xs font-semibold text-slate-600 block mb-2">Popular ideas:</span>
              <div class="flex flex-wrap gap-2 text-xs">
                <button type="button" class="preset-title px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors">
                  Monthly Dues
                </button>
                <button type="button" class="preset-title px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors">
                  End of Year Contribution
                </button>
                <button type="button" class="preset-title px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors">
                  Office Lunch Group
                </button>
              </div>
            </div>
          </div>
        `;

      case 2:
        return `
          <div class="space-y-4">
            <div class="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-emerald-950 text-xs leading-relaxed flex gap-2.5">
              <span class="text-base">💡</span>
              <div>
                <strong>Hint:</strong> Target helps calculate how much is left. If amounts vary, you can leave it empty.
              </div>
            </div>

            <div>
              <label for="wizardTarget" class="block text-sm font-bold text-slate-800 mb-1">
                Target amount per person (₦)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
                <input
                  id="wizardTarget"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  step="100"
                  class="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder-slate-400"
                  placeholder="e.g. 5000"
                  value="${escapeHtml(wizardData.target)}"
                />
              </div>
              <p class="text-xs text-slate-500 mt-1.5">Short hint: Optional. How much each member should pay.</p>
            </div>

            <div>
              <label for="wizardDate" class="block text-sm font-bold text-slate-800 mb-1">
                Due date (optional)
              </label>
              <input
                id="wizardDate"
                type="date"
                class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                value="${escapeHtml(wizardData.endDate)}"
              />
              <p class="text-xs text-slate-500 mt-1.5">Short hint: Optional deadline for contributions.</p>
            </div>
          </div>
        `;

      case 3:
        return `
          <div class="space-y-4">
            <div class="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-emerald-950 text-xs leading-relaxed flex gap-2.5">
              <span class="text-base">💡</span>
              <div>
                <strong>Hint:</strong> You can add more people at any time. Phone number is optional.
              </div>
            </div>

            <div>
              <label for="wizardPeople" class="block text-sm font-bold text-slate-800 mb-1">
                Who needs to pay?
              </label>
              <textarea
                id="wizardPeople"
                rows="5"
                class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder-slate-400"
                placeholder="Amina Bello, 08012345678&#10;David Okafor&#10;Tunde Smith"
              >${escapeHtml(wizardData.peopleText)}</textarea>
              <p class="text-xs text-slate-500 mt-1.5">Short hint: Type one person per line. Format: Name, Phone (optional).</p>
            </div>

            <p class="text-xs text-slate-500">
              Each person will get their own unique link to track what they have paid!
            </p>
          </div>
        `;

      case 4:
        const count = wizardData.peopleText
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean).length;
        const targetNum = Number(wizardData.target) || 0;
        return `
          <div class="space-y-4">
            <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div class="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-1">
                <svg class="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Almost ready to save!
              </div>
              <p class="text-xs text-emerald-900">
                Review your record details below. You can edit them at any time.
              </p>
            </div>

            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="text-slate-500 text-xs">Record title:</span>
                <span class="font-bold text-slate-900">${escapeHtml(wizardData.title || 'Untitled')}</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="text-slate-500 text-xs">Target per person:</span>
                <span class="font-bold text-slate-900">${targetNum ? '₦' + targetNum.toLocaleString() : 'No set target'}</span>
              </div>
              <div class="flex justify-between items-center pb-2 border-b border-slate-200">
                <span class="text-slate-500 text-xs">People count:</span>
                <span class="font-bold text-slate-900">${count} people</span>
              </div>
              ${
                wizardData.endDate
                  ? `<div class="flex justify-between items-center">
                      <span class="text-slate-500 text-xs">Due date:</span>
                      <span class="font-semibold text-slate-900">${escapeHtml(wizardData.endDate)}</span>
                     </div>`
                  : ''
              }
            </div>

            <div class="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 space-y-1">
              <p class="font-semibold text-slate-800">What happens next?</p>
              <p>• You will be able to log payments with 1 tap.</p>
              <p>• You can copy and WhatsApp private progress links to everyone.</p>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  update();

  // Preset titles helper
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('preset-title')) {
      const input = container.querySelector('#wizardTitle') as HTMLInputElement;
      if (input) {
        input.value = target.textContent?.trim() || '';
        wizardData.title = input.value;
      }
    }
  });
}

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
