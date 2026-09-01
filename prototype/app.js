const state = {
  step: 1,
  answers: { orgName: '', size: '', sector: '', regulated: '', regulator: '', usage: '', tools: [], sensitive: '', consequential: '', accountability: '' },
  controls: Array(8).fill(null),
  returnView: 'results'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

const minimumControls = [
  {
    number: '01', title: 'Someone owns AI',
    summary: 'One named person is accountable for how AI is used across the organisation, and AI is a standing item at least quarterly.',
    evidence: ['A named AI lead that everyone knows', 'AI use, risks and incidents reported to the board or senior team at least quarterly'],
    checklist: 'Name the AI lead and tell everyone who it is',
    detail: 'Put AI on the agenda of the existing management or board meeting at least quarterly.'
  },
  {
    number: '02', title: 'You know what is being used',
    summary: 'You hold a written list of approved AI tools and a simple register of what is actually in use.',
    evidence: ['An approved tools list staff can find in under a minute', 'A register recording each tool, who uses it, what for and the data it touches'],
    checklist: 'Build the approved tools list and AI register',
    detail: 'Ask every team what they use, including free, embedded and personal-account tools.'
  },
  {
    number: '03', title: 'You have a written AI usage policy',
    summary: 'A policy exists, it has been issued to everyone, and people have confirmed they have read it.',
    evidence: ['The policy issued to staff, contractors and temporary workers', 'The policy included in induction, with acknowledgements recorded'],
    checklist: 'Complete, approve and issue the AI Usage Policy',
    detail: 'Collect acknowledgements and add the policy to induction on the same day.'
  },
  {
    number: '04', title: 'Your data rules are explicit',
    summary: 'People know exactly what must never be entered into an AI tool, and which tools are cleared for which categories of data.',
    evidence: ['A written plain-language rule for confidential, client and personal data', 'Data terms, lawful basis and model-training settings checked for approved tools touching personal data'],
    checklist: 'Write and issue the data rules in plain language',
    detail: 'State the never list, the cleared tools and who to ask before anyone pastes.',
    redline: true
  },
  {
    number: '05', title: 'Unapproved tools are brought into the open',
    summary: 'Staff can ask for a new tool easily, and they can declare what they are already using without fear of what happens next.',
    evidence: ['A simple request route with decisions made within days', 'An amnesty for declaring existing tools and personal accounts used for work'],
    checklist: 'Open the new-tool route and run the amnesty',
    detail: 'Give requests a fast answer and provide a sanctioned alternative to personal accounts.'
  },
  {
    number: '06', title: 'A human checks before anything leaves',
    summary: 'No AI-assisted work reaches a client, customer, regulator or the board without a named human verifying it.',
    evidence: ['Facts, figures, quotations and sources checked against a reliable source', 'High-impact work reviewed by a second qualified person, with the decision kept with a named human'],
    checklist: 'Make human verification a named step',
    detail: 'Build it into the existing review process and record sign-off for high-impact work.',
    redline: true
  },
  {
    number: '07', title: 'You tell people when AI is involved',
    summary: 'Your AI use is visible to the people affected by it, at a level proportionate to the contribution.',
    evidence: ['A website AI statement and a line in the email footer', 'Meeting note-takers disclosed and client deliverables declared where AI made a substantive contribution'],
    checklist: 'Put the disclosure routes in place',
    detail: 'Publish the standing statements, update meeting invitations and use the Transparency Index for deliverables.'
  },
  {
    number: '08', title: 'People are trained, and incidents get reported',
    summary: 'Everyone has had at least a short session on responsible AI use, and there is a route to report when something goes wrong.',
    evidence: ['Basic AI governance and data protection training completed in the last twelve months', 'A named incident contact, written reporting route and reviewed incident log'],
    checklist: 'Run the training hour and open the incident route',
    detail: 'Include the policy, data rules, verification and reporting; take the incident log to the quarterly meeting.'
  }
];

function showView(name) {
  $$('.view').forEach(view => view.classList.toggle('is-active', view.dataset.view === name));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function setWizardStep(step) {
  state.step = Math.max(1, Math.min(8, step));
  $$('.question-panel').forEach(panel => panel.classList.toggle('is-current', Number(panel.dataset.step) === state.step));
  $('#progress-copy').textContent = `Context ${state.step} of 8`;
  $('#progress-bar').style.width = `${state.step / 8 * 100}%`;
  $('#prev-question').classList.toggle('is-visible', state.step > 1);
  $('#next-question').innerHTML = state.step === 8 ? 'Continue to the eight-point check <span>→</span>' : 'Continue <span>→</span>';
}

function getSelected(name) {
  return $(`[data-name="${name}"] .is-selected`)?.dataset.value || '';
}

function collectContext() {
  state.answers.orgName = $('#org-name').value.trim();
  ['size', 'sector', 'regulated', 'usage', 'sensitive', 'consequential', 'accountability'].forEach(name => state.answers[name] = getSelected(name));
  state.answers.regulator = $('#regulator-name').value.trim();
  state.answers.tools = $$('[data-name="tools"] input:checked').map(input => input.value);
}

function validateContext() {
  collectContext();
  const error = $(`.question-panel[data-step="${state.step}"] .field-error`);
  const valuesByStep = {
    1: state.answers.orgName,
    2: state.answers.size,
    3: state.answers.sector && state.answers.regulated && (state.answers.regulated !== 'Yes' || state.answers.regulator),
    4: state.answers.usage,
    5: state.answers.tools.length,
    6: state.answers.sensitive,
    7: state.answers.consequential,
    8: state.answers.accountability
  };
  const valid = Boolean(valuesByStep[state.step]);
  error.textContent = valid ? '' : state.step === 3 ? 'Choose a sector and regulatory status. Add the regulator category or name if you selected yes.' : 'Please choose an answer before continuing.';
  return valid;
}

function renderAssessment() {
  $('#assessment-controls').innerHTML = minimumControls.map((control, index) => `
    <article class="assessment-control ${control.redline ? 'is-redline' : ''}" data-assessment-item="${index}">
      <div class="assessment-number">${control.number}</div>
      <div class="assessment-copy">
        <div class="assessment-title-row"><h2>${control.title}</h2>${control.redline ? '<span class="redline-label">Red line</span>' : ''}</div>
        <p>${control.summary}</p>
        <ul>${control.evidence.map(item => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div class="binary-choice" aria-label="${control.title}">
        <button type="button" data-control-index="${index}" data-answer="true" aria-pressed="${state.controls[index] === true}" class="${state.controls[index] === true ? 'is-selected' : ''}">Yes</button>
        <button type="button" data-control-index="${index}" data-answer="false" aria-pressed="${state.controls[index] === false}" class="${state.controls[index] === false ? 'is-selected' : ''}">No</button>
      </div>
    </article>`).join('');
  $('#assessment-error').textContent = '';
  showView('assessment');
}

function runGeneration() {
  showView('generation');
  $('#generation-org').textContent = state.answers.orgName;
  const second = $('#gen-step-two');
  const third = $('#gen-step-three');
  [second, third].forEach(step => { step.classList.remove('is-done'); step.querySelector('b').textContent = '·'; });
  $('#generation-status').textContent = 'Scoring the eight-point Minimum Standard…';
  setTimeout(() => {
    second.classList.add('is-done');
    second.querySelector('b').textContent = '✓';
    $('#generation-status').textContent = 'Applying organisation context without changing the source requirements…';
  }, 700);
  setTimeout(() => {
    third.classList.add('is-done');
    third.querySelector('b').textContent = '✓';
    $('#generation-status').textContent = 'Preparing the four-part pack and thirty-day actions…';
  }, 1400);
  setTimeout(renderResults, 2250);
}

function standardResult() {
  const score = state.controls.filter(Boolean).length;
  let band;
  if (score === 8) band = { title: 'The minimum is in place.', summary: 'You are ready for a full governance of AI review. Set an annual refresh of the policy and the register.' };
  else if (score >= 6) band = { title: 'Close, with live gaps.', summary: 'Close the gaps within thirty days. Use the starter guidance note and implementation checklist in this pack.' };
  else if (score >= 3) band = { title: 'Material exposure.', summary: 'AI is in use and largely ungoverned. Adopt the policy this month, issue the staff note and build the register.' };
  else band = { title: 'You are relying on luck.', summary: 'Start immediately, and treat this as a board-level risk owned by the leadership team.' };
  const redLineGaps = minimumControls.filter((control, index) => control.redline && state.controls[index] === false);
  return { score, band, redLineGaps };
}

function renderResults() {
  const answers = state.answers;
  const result = standardResult();
  $('#result-org').textContent = answers.orgName;
  $('#pack-date').textContent = `Generated ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}`;
  $('#readiness-title').textContent = result.band.title;
  $('#readiness-summary').textContent = result.band.summary;
  $('#readiness-number').textContent = `${result.score} / 8`;
  $('#readiness-circle').style.strokeDashoffset = 326.7 - (326.7 * result.score / 8);
  const redLine = $('#redline-result');
  if (result.redLineGaps.length) {
    redLine.className = 'redline-result is-open';
    redLine.innerHTML = `<strong>Minimum not met: red line open</strong><span>${result.redLineGaps.map(control => `Point ${Number(control.number)} — ${control.title}`).join('; ')}. A no against point 4 or 6 means the minimum is not met, whatever the total score.</span>`;
  } else {
    redLine.className = 'redline-result is-clear';
    redLine.innerHTML = '<strong>Red-line check</strong><span>Points 4 and 6 are recorded as in place.</span>';
  }
  $('#context-sector').textContent = answers.sector;
  $('#context-regulation').textContent = answers.regulated === 'Yes' ? `Regulated · ${answers.regulator}` : answers.regulated === 'Not sure' ? 'Regulation not confirmed' : 'Not regulated';
  $('#context-size').textContent = answers.size;
  $('#context-usage').textContent = `${answers.usage.split(' — ')[0]} AI`;
  $('#context-accountability').textContent = answers.accountability;
  const token = localStorage.getItem('governance-return-token') || Math.random().toString(36).slice(2, 18);
  localStorage.setItem('governance-return-token', token);
  $('#personal-link').textContent = `governance.ai/p/${token.slice(0, 4)}••••••••${token.slice(-4)}`;
  $('#pack-update-notice').hidden = false;
  $('#email-link-message').textContent = '';
  renderBareMinimumPack();
  renderChecklist();
  renderFullPlaybookRecommendation();
  showView('results');
}

function playbookRecommendation() {
  const signals = [];
  if (state.answers.accountability === 'None yet / not established') signals.push('no board or senior accountability position has yet been established');
  if (state.answers.consequential === 'Yes — it informs consequential decisions') signals.push('AI may inform consequential decisions about people');
  if (state.controls[2] === false) signals.push('a written AI Usage Policy is not yet in place');
  if (state.answers.regulated === 'Yes') signals.push(`the organisation has identified a regulated context (${state.answers.regulator})`);
  const baseline = 'The Full AI Playbook provides a board-ready route through strategy, governance architecture, policy, transparency, assurance and implementation.';
  return signals.length ? `${baseline} The current context indicates ${signals.join(', ')}. These are areas where a deeper governance review may be particularly valuable.` : `${baseline} It is the next-tier pathway for organisations that want to move beyond the immediate minimum.`;
}

function renderFullPlaybookRecommendation() {
  const recommendation = playbookRecommendation();
  $('#playbook-recommendation').textContent = recommendation;
  $('#playbook-signal').textContent = recommendation;
}

function renderBareMinimumPack() {
  const organisation = escapeHTML(state.answers.orgName);
  const uses = state.answers.tools.filter(tool => tool !== 'No AI use yet').map(escapeHTML);
  const useContext = uses.length ? ` The recorded AI activity includes ${uses.slice(0, 3).join(', ')}.` : '';
  const gaps = minimumControls.filter((control, index) => state.controls[index] === false);
  const gapLabel = gaps.length ? `Priority from the recorded assessment: close ${gaps.map(control => `Point ${Number(control.number)} — ${control.title}`).join('; ')}.` : 'All eight controls are recorded as in place. Retain the evidence and set the source-required annual refresh.';
  const transparencyFor = (index) => {
    const source = minimumControls[index].summary;
    let contextual = source;
    if (index === 1) contextual = `For ${organisation}, maintain the written approved tools list and actual-use register. ${useContext} The requirement itself is unchanged.`;
    if (index === 3) contextual = `For ${organisation}, make the never-enter list and cleared-tool guidance easy to find. ${state.answers.sensitive !== 'No — not currently' ? 'The recorded context indicates that sensitive or confidential information may be involved, so this point deserves immediate attention.' : ''} The underlying data requirement is unchanged.`;
    if (index === 5) contextual = `For ${organisation}, keep a named human responsible for verifying AI-assisted work before it leaves. ${state.answers.consequential === 'Yes — it informs consequential decisions' ? 'Because AI may inform consequential decisions about people, use the existing qualified review and named-human accountability requirements with particular care.' : ''} No additional requirement is being introduced.`;
    if (index === 6) contextual = `For ${organisation}, make disclosure proportionate to the AI contribution. ${state.answers.regulated === 'Yes' ? `The recorded regulated context (${escapeHTML(state.answers.regulator)}) helps shape examples, but this pack does not claim that a regulator requires anything beyond the source standard.` : ''} The underlying requirement is unchanged.`;
    return `<div class="transparency"><button type="button" aria-expanded="false">Why was this contextualised? <span>+</span></button><div class="transparency-body"><div class="comparison"><span>Source requirement</span><p>${source}</p></div><div class="comparison contextual"><span>Presented for ${organisation}</span><p>${contextual}</p></div></div></div>`;
  };
  const controls = minimumControls.map((control, index) => {
    const met = state.controls[index];
    const transparency = [1, 3, 5, 6].includes(index) ? transparencyFor(index) : '';
    return `<article class="control-result ${met ? 'is-met' : 'is-gap'}"><span class="policy-number">${control.number}</span><div class="policy-content"><div class="control-title-line"><h4>${control.title}</h4><span class="control-status">${met ? 'Reported in place' : 'Reported gap'}</span></div><p>${control.summary}${index === 1 ? useContext : ''}</p></div>${control.redline ? '<span class="policy-tag red">Red line</span>' : '<span class="policy-tag">Standard</span>'}${transparency}</article>`;
  }).join('');
  const planCard = (week, title, copy, owner, points) => {
    const relevant = points.filter(index => state.controls[index] === false);
    return `<article class="${relevant.length ? 'is-priority' : ''}"><span>${week}</span><h4>${title}</h4><p>${copy}</p><small>${relevant.length ? `Addresses reported gap${relevant.length > 1 ? 's' : ''}: ${relevant.map(index => `Point ${minimumControls[index].number}`).join(', ')}` : owner}</small></article>`;
  };

  $('#bare-minimum-pack').innerHTML = `
    <section class="pack-part" id="part-1">
      <div class="part-heading"><span>Part 1</span><div><h3>AI Minimum Standard</h3><p>The authoritative eight-point check, shown as ${organisation}’s recorded yes or no starting position. Later checklist progress does not change this record.</p></div></div>
      <div class="control-results">${controls}</div>
    </section>
    <section class="pack-part" id="part-2">
      <div class="part-heading"><span>Part 2</span><div><h3>Starter guidance note / 30-day plan</h3><p>A practical thirty-day plan for closing the recorded gaps, using the source guidance.</p></div></div>
      <p class="part-priority">${gapLabel}</p>
      <div class="thirty-day-plan">
        ${planCard('Week 1', 'Ownership and discovery', 'Name the AI lead. Ask every team what tools they use. Open the amnesty with a deadline.', 'Owner or managing director', [0, 1, 4])}
        ${planCard('Week 2', 'Register and data terms', 'Build the register. Decide what is approved, approved with conditions and not approved. Check data processing terms for anything touching personal data.', 'AI lead', [1, 3])}
        ${planCard('Week 3', 'Policy and staff note', 'Fill in the policy. Approve it at the management or board meeting and minute the decision. Issue it with the staff note.', 'AI lead and board', [2])}
        ${planCard('Week 4', 'Training and disclosure', 'Run the training hour. Publish the website statement and email footer. Add note-taker disclosure and set the quarterly agenda item.', 'AI lead', [0, 5, 6, 7])}
      </div>
    </section>
    <section class="pack-part" id="part-3">
      <div class="part-heading"><span>Part 3</span><div><h3>AI Usage Policy template</h3><p>Prepared for ${organisation}. Complete the bracketed fields, approve it, issue it to everyone and collect acknowledgements.</p></div></div>
      <div class="policy-preview">
        <details open><summary><span>01</span>Purpose and scope</summary><p>This policy sets out how ${organisation} uses artificial intelligence. It protects clients, data and people, and makes sure that a human being is always accountable for the work produced. It applies to everyone working for the organisation and to every AI tool, including AI embedded in existing software.</p></details>
        <details><summary><span>02</span>Core principles</summary><p>Human accountability; AI augments people; proportionate governance; data protection first; transparency; and lawful and ethical use.</p></details>
        <details><summary><span>03</span>Approved tools and the register</summary><p>Only tools on the approved list may be used for work. The AI lead maintains a register recording the tool, provider, users, purpose, data, processing terms and approval decision.</p></details>
        <details><summary><span>04</span>Data rules</summary><p>Client, personal, financial, strategic, credential and third-party information must never enter a public or unapproved AI tool. Approved use of personal data requires a data processing agreement, a lawful basis and model training on organisational data switched off.</p></details>
        <details><summary><span>05</span>Human verification and disclosure</summary><p>AI output is always a draft. Facts, figures, references, tone and bias are checked before release; significant work receives qualified second-person review. Disclosure is proportionate to the AI contribution.</p></details>
        <details><summary><span>06</span>Training, incidents and review</summary><p>Training covers the policy, data rules, verification, disclosure and incident reporting. Incidents are reported the same day, logged and reviewed. The policy is reviewed at least annually and when tools, risks or regulation change materially.</p></details>
      </div>
      <p class="source-boundary">Prototype preview: the source policy template contains seventeen sections plus an AI register template and staff acknowledgement. This view shows its structure without replacing the source document.</p>
    </section>
    <section class="pack-part" id="part-4">
      <div class="part-heading"><span>Part 4</span><div><h3>Staff note: using AI at work</h3><p>Send this to everyone on the day the policy is approved.</p></div></div>
      <blockquote class="staff-summary">Use approved tools, keep our data out of them unless they are cleared for it, check everything before it leaves your hands, say when AI helped, and tell us straight away if something goes wrong.</blockquote>
      <div class="staff-rules">
        <article><span>01</span><h4>Use the tools on the approved list</h4><p>Ask the AI lead before using something new; do not begin with a free trial while approval is pending.</p></article>
        <article><span>02</span><h4>Never paste in anything you would not email to a stranger</h4><p>Client, personal, financial, commercially sensitive and NDA-covered information stays out of public AI tools.</p></article>
        <article><span>03</span><h4>Check it before it goes out</h4><p>Verify facts, figures, names and sources. Qualified review is required before work goes to a client, customer, regulator or the board.</p></article>
        <article><span>04</span><h4>Say when AI helped</h4><p>Declare substantive AI contribution on client work and disclose note-takers before external meetings.</p></article>
        <article><span>05</span><h4>Tell us if something goes wrong</h4><p>Report data exposure, errors, bias or undeclared use to the incident contact on the same day.</p></article>
      </div>
    </section>`;
}

function storageKey() {
  return `governance-minimum-checklist-v3-${state.answers.orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

function renderChecklist() {
  const actions = minimumControls.map((control, index) => ({ control, index })).filter(({ index }) => state.controls[index] === false);
  const stored = localStorage.getItem(storageKey());
  const saved = stored ? JSON.parse(stored) : [];
  if (!stored) localStorage.setItem(storageKey(), JSON.stringify(saved));
  $('#checklist-origin').textContent = actions.length ? `Starting position: ${actions.length} reported ${actions.length === 1 ? 'gap' : 'gaps'} from the original assessment. Completing an action below does not change that recorded result.` : 'Starting position: all eight controls were reported in place. Use this space to retain evidence and schedule the annual source-required refresh.';
  $('#checklist').innerHTML = actions.length ? actions.map(({ control, index }) => `
    <div class="check-item ${saved.includes(index) ? 'is-complete' : ''}">
      <input id="check-${index}" type="checkbox" data-index="${index}" ${saved.includes(index) ? 'checked' : ''}/>
      <label for="check-${index}">${control.checklist}<small>${control.detail}</small></label>
      <span>Point ${control.number}${control.redline ? ' · Red line' : ''}</span>
    </div>`).join('') : `<div class="checklist-clear"><strong>No remediation actions are shown.</strong><span>Keep the evidence for each control and complete the annual refresh of the policy and register.</span></div>`;
  updateCompletion();
}

function updateCompletion() {
  const checked = $$('[data-index]:checked').length;
  const total = $$('[data-index]').length;
  const percent = total ? Math.round(checked / total * 100) : 100;
  $('#completion-number').textContent = `${percent}%`;
  $('#completion-bar').style.width = `${percent}%`;
}

function resetFlow() {
  state.step = 1;
  state.answers = { orgName: '', size: '', sector: '', regulated: '', regulator: '', usage: '', tools: [], sensitive: '', consequential: '', accountability: '' };
  state.controls = Array(8).fill(null);
  $('#wizard-form').reset();
  $('#regulator-field').hidden = true;
  $$('.is-selected', $('#wizard-form')).forEach(element => element.classList.remove('is-selected'));
  setWizardStep(1);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

document.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'start') { setWizardStep(1); showView('wizard'); }
  if (action === 'home') showView('landing');
  if (action === 'back') state.step > 1 ? setWizardStep(state.step - 1) : showView('landing');
  if (action === 'back-context') { setWizardStep(8); showView('wizard'); }
  if (action === 'restart') { resetFlow(); showView('wizard'); }
  if (action === 'print') window.print();
  if (action === 'playbook') { state.returnView = $('.results-page').classList.contains('is-active') ? 'results' : 'landing'; showView('playbook'); }
  if (action === 'back-results') showView(state.returnView);
  if (action === 'copy-link') { navigator.clipboard?.writeText($('#personal-link').textContent); showToast('Personal return link copied — simulated for this prototype'); }
  if (action === 'continue-pack') { $('#pack-update-notice').hidden = true; showToast('Continuing with Source v1.0'); }
  if (action === 'update-pack') { $('#pack-update-notice').hidden = true; showToast('An updated pack would be generated from the newer source version.'); }

  const contextChoice = event.target.closest('[data-name] button[data-value]');
  if (contextChoice) {
    const group = contextChoice.closest('[data-name]');
    $$('.is-selected', group).forEach(button => button.classList.remove('is-selected'));
    contextChoice.classList.add('is-selected');
    if (group.dataset.name === 'regulated') {
      const field = $('#regulator-field');
      field.hidden = contextChoice.dataset.value !== 'Yes';
      if (field.hidden) $('#regulator-name').value = '';
    }
    group.closest('.question-panel').querySelector('.field-error').textContent = '';
  }

  const controlChoice = event.target.closest('[data-control-index][data-answer]');
  if (controlChoice) {
    const index = Number(controlChoice.dataset.controlIndex);
    state.controls[index] = controlChoice.dataset.answer === 'true';
    const item = controlChoice.closest('.assessment-control');
    $$('[data-control-index]', item).forEach(button => {
      const selected = button === controlChoice;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    item.classList.remove('needs-answer');
    $('#assessment-error').textContent = '';
  }

  const transparency = event.target.closest('.transparency > button');
  if (transparency) {
    const box = transparency.closest('.transparency');
    const open = box.classList.toggle('is-open');
    transparency.setAttribute('aria-expanded', String(open));
    transparency.querySelector('span').textContent = open ? '−' : '+';
  }
});

$('#wizard-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!validateContext()) return;
  if (state.step === 8) renderAssessment();
  else setWizardStep(state.step + 1);
});

$('#assessment-form').addEventListener('submit', event => {
  event.preventDefault();
  const unanswered = state.controls.map((answer, index) => answer === null ? index : null).filter(index => index !== null);
  $$('.assessment-control').forEach((item, index) => item.classList.toggle('needs-answer', unanswered.includes(index)));
  if (unanswered.length) {
    $('#assessment-error').textContent = `Answer all eight controls to score the Minimum Standard. ${unanswered.length} ${unanswered.length === 1 ? 'answer is' : 'answers are'} still needed.`;
    $(`[data-assessment-item="${unanswered[0]}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  runGeneration();
});

$('#email-link-form').addEventListener('submit', event => {
  event.preventDefault();
  const email = $('#return-email');
  if (!email.checkValidity()) {
    email.reportValidity();
    return;
  }
  $('#email-link-message').textContent = `Prototype only: a return link would be sent to ${email.value}. ${$('#marketing-consent').checked ? 'You opted in to updates.' : 'No marketing updates were selected.'}`;
});

document.addEventListener('change', event => {
  if (event.target.matches('[data-index]')) {
    const saved = $$('[data-index]:checked').map(input => Number(input.dataset.index));
    localStorage.setItem(storageKey(), JSON.stringify(saved));
    event.target.closest('.check-item').classList.toggle('is-complete', event.target.checked);
    updateCompletion();
  }
  if (event.target.matches('[data-name="tools"] input')) {
    const toolInputs = $$('[data-name="tools"] input');
    const noTools = toolInputs.find(input => input.value === 'No AI use yet');
    if (event.target === noTools && noTools.checked) toolInputs.filter(input => input !== noTools).forEach(input => input.checked = false);
    if (event.target !== noTools && event.target.checked) noTools.checked = false;
  }
  if (event.target.matches('.check-grid input')) event.target.closest('.question-panel').querySelector('.field-error').textContent = '';
});

setWizardStep(1);
