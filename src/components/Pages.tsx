import { useState } from 'react';
import { CONTACT_EMAIL, REPO, hasContactEmail, type Route } from '../site';

/**
 * The public pages.
 *
 * Every claim on them has to match what the code actually does. The
 * privacy page in particular is written from the schema rather than from
 * a template: if a table is added, that page is the one that changes.
 */

export function About() {
  return (
    <>
      <h1>What Preventah is.</h1>
      <p className="lede">
        A way for a household to act on the illnesses that already run in it, instead of waiting
        to find out who inherited what.
      </p>

      <section className="window plated">
        <p className="bar cream">What it does</p>
        <p>
          You pick the conditions from a curated catalog. Those choices map to tags, and the tags
          select what you are shown each day from a body of guidance drawn from the WHO, the NHS,
          the CDC and MedlinePlus. Every item names the source it came from and links to it, so
          you can check the advice rather than take ours for it.
        </p>
        <p>
          Checking an action off writes to a shared board, so a household can see the habit
          holding without anyone having to report on themselves.
        </p>
      </section>

      <section className="window">
        <p className="bar ink">What it is not</p>
        <ul>
          <li>
            <strong>Not a diagnosis.</strong> Nothing here tells you what you have or what you
            will get. A family history raises the value of prevention and of a conversation with
            a clinician; it is not a prediction.
          </li>
          <li>
            <strong>Not personalised medicine.</strong> The guidance is general and public. Your
            selections choose which of it you see; they never change what it says.
          </li>
          <li>
            <strong>Not a hospital directory, a symptom checker or a triage tool.</strong> If
            something is wrong, this is not the thing to open.
          </li>
          <li>
            <strong>Not a medical record.</strong> It holds condition ids from a fixed catalog,
            never free text, never notes from a clinician.
          </li>
        </ul>
      </section>

      <p className="tiny">
        Built for the Convex All Gas Hackathon. Source at <a href={REPO}>{REPO}</a>.
      </p>
    </>
  );
}

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What am I consenting to?',
    a: (
      <>
        To Preventah storing the conditions you pick so it can show you matching guidance, and to
        the rest of your household seeing that you checked in and how many conditions you track.
        They never see which ones. You can withdraw at any time, and withdrawing clears your
        selections rather than keeping them for later.
      </>
    ),
  },
  {
    q: 'What is the join code for?',
    a: (
      <>
        It is how you enter a household, not how you log in. Six characters, no letters that get
        misheard, and anyone who has it can join. Treat it like a door number rather than a key,
        and only give it to people you would let in the front door.
      </>
    ),
  },
  {
    q: 'Where does the guidance come from?',
    a: (
      <>
        A curated table written from public-health material: the World Health Organization, the
        NHS, the CDC and MedlinePlus. Every action shows its source and links out. Nothing is
        generated on the fly, so the same day and the same selections always produce the same
        three actions.
      </>
    ),
  },
  {
    q: 'Does an AI write my plan?',
    a: (
      <>
        No. The plan is resolved from that fixed table. A language model may tighten the wording
        of a title once a day, and it is never allowed to introduce a drug, a dose, a lab test or
        a claim the source did not make; anything that tries is rejected and the original wording
        shows instead. Sources are never touched.
      </>
    ),
  },
  {
    q: 'What do the emails do?',
    a: (
      <>
        Two, both optional and both off until you save an address. A morning plan at 07:00 your
        local time, and a gentle nudge at 19:00 if the previous day went by without a check-in.
        The app works fully without either.
      </>
    ),
  },
  {
    q: 'Can I use it on my own?',
    a: (
      <>
        Yes, and it is not a lesser version. Choosing <em>Just me</em> creates a household with
        one person in it: same actions, same board, same everything. The join code still exists,
        tucked away, if you ever want to add someone.
      </>
    ),
  },
  {
    q: 'What happens to my data?',
    a: (
      <>
        It stays in this app's Convex deployment. There are no ads, no trackers, no analytics
        pixels and nothing sold. The privacy page lists every field, one by one.
      </>
    ),
  },
  {
    q: 'Is this medical advice?',
    a: (
      <>
        No. It is general lifestyle guidance of the kind public-health bodies publish for
        everyone. It is not tailored to a diagnosis, and it is not a substitute for talking to a
        clinician about a family history that worries you.
      </>
    ),
  },
];

/**
 * The questions, as an accordion.
 *
 * One open at a time, because the point of the page is to answer the one
 * thing someone came to ask rather than to present eight essays. The row
 * is a real button, so Enter and Space work without any key handling of
 * our own, and the open row wears the same mint bar Today uses for a
 * completed action: mint means active here as it does there.
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <h1>Questions.</h1>
      <div className="accordion">
        {FAQS.map((item, index) => {
          const isOpen = open === index;
          const panelId = `faqPanel${index}`;
          const buttonId = `faqButton${index}`;
          return (
            <section className={isOpen ? 'window acc open' : 'window acc'} key={item.q}>
              <h2 className="accHead">
                <button
                  id={buttonId}
                  className="accButton"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  <span className="accQ">{item.q}</span>
                  <span className="chevron" aria-hidden="true" />
                </button>
              </h2>
              <div
                className={isOpen ? 'disclosure open' : 'disclosure'}
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
              >
                <div className="disclosureInner">
                  <p className="accBody">{item.a}</p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export function Privacy() {
  return (
    <>
      <h1>Privacy.</h1>
      <p className="lede">
        This page lists what Preventah actually stores. It was written from the database schema,
        not from a template, so it says what the code does.
      </p>

      <section className="window plated">
        <p className="bar cream">What is stored</p>
        <ul>
          <li>
            <strong>A first name</strong>, the one you type when you create or join a household.
          </li>
          <li>
            <strong>A household</strong>: its name, its join code, and who belongs to it.
          </li>
          <li>
            <strong>Condition ids from the catalog.</strong> Ids only, from a fixed list. There is
            no free-text field anywhere in the app, so nothing you write can become part of a
            health record.
          </li>
          <li>
            <strong>Check-ins</strong>: which action, which day, and an optional short note.
          </li>
          <li>
            <strong>An email address and a timezone</strong>, only if you save them for the
            morning plan. Leave them blank and nothing is stored.
          </li>
          <li>
            <strong>A log of intended sends</strong>, so a retried job cannot email you twice.
          </li>
          <li>
            <strong>Cached public-health links</strong> fetched by Firecrawl for the conditions
            you track. Public pages, fetched by the server, not by your browser.
          </li>
          <li>
            <strong>A daily wording row</strong> if the optional rewrite ran: the rewritten
            titles, which model answered, and whether it fell back.
          </li>
        </ul>
      </section>

      <section className="window">
        <p className="bar ink">What is not</p>
        <ul>
          <li>No wearables, no step counts, no heart rate, no device sensors.</li>
          <li>No advertising, no ad networks, no pixels, no Google Analytics.</li>
          <li>No cookie banner, because there are no non-essential cookies to consent to.</li>
          <li>No location beyond a timezone name you choose to save.</li>
          <li>Nothing sold, and nothing shared with a third party for marketing.</li>
        </ul>
      </section>

      <section className="window">
        <p className="bar cream">Who sees what</p>
        <p>
          People in your household see your name, that you checked in today, how many conditions
          you track and your streak. They do not see which conditions you picked, your notes or
          your email address.
        </p>
      </section>

      <section className="window">
        <p className="bar cream">Leaving</p>
        <p>
          Profile has <strong>Leave this household on this device</strong>, which detaches this
          browser. Withdrawing consent clears your condition selections. To have a household's
          rows deleted outright, use the contact route below.
        </p>
      </section>

      <section className="window">
        <p className="bar cream">Processors</p>
        <p>
          Convex hosts the app and its database. AgentMail sends the optional emails and receives
          the address you saved. Firecrawl receives a condition name in a search query, never
          anything about you. OpenAI receives three action titles and their one-line hows when the
          optional rewrite runs, and never your conditions, name or email.
        </p>
      </section>
    </>
  );
}

export function Terms() {
  return (
    <>
      <h1>Terms.</h1>

      <section className="window plated">
        <p className="bar ink">Not medical advice</p>
        <p>
          Preventah offers general lifestyle guidance of the kind public-health bodies publish for
          the whole population. It does not diagnose, treat, predict or monitor any condition, and
          it is not a substitute for a clinician. If you are worried about a family history, that
          is a conversation to have with one.
        </p>
      </section>

      <section className="window">
        <p className="bar cream">What this is</p>
        <p>
          A project built for the Convex All Gas Hackathon and offered as-is, without warranty of
          any kind. It may change or stop working without notice. Do not rely on it for anything
          that matters medically, and keep your own record of anything you need to keep.
        </p>
      </section>

      <section className="window">
        <p className="bar cream">Acceptable use</p>
        <ul>
          <li>Do not put anyone else's health information in it without their agreement.</li>
          <li>Do not share a join code with people the household would not let in.</li>
          <li>Do not use it to give anyone medical advice, including yourself.</li>
          <li>Do not attempt to disrupt the service or the people using it.</li>
        </ul>
      </section>

      <p className="tiny">Source at <a href={REPO}>{REPO}</a>.</p>
    </>
  );
}

export function Contact({ go }: { go: (to: Route) => void }) {
  return (
    <>
      <h1>Contact.</h1>

      <section className="window plated">
        <p className="bar cream">There is no office</p>
        <p>
          Preventah is a hackathon project, not a company. There is no street address, no phone
          line and no support desk, and inventing one would only waste your time.
        </p>
        {hasContactEmail() ? (
          <p>
            Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        ) : (
          <p className="muted">
            No public address has been set up yet, so none is published here. Until one exists,
            the repository is the reliable way to reach the project.
          </p>
        )}
        <p>
          Issues and questions: <a href={`${REPO}/issues`}>{REPO}/issues</a>
        </p>
      </section>

      <section className="window">
        <p className="bar cream">Mail inside the app</p>
        <p>
          The Mail tab is not a contact form. It is where you save an address to receive your own
          morning plan, and where the last send is reported in plain language.
        </p>
        <button className="btn" onClick={() => go('/mail')}>
          Go to the Mail tab
        </button>
      </section>
    </>
  );
}

export function NotFound({ go }: { go: (to: Route) => void }) {
  return (
    <>
      <h1>That page does not exist.</h1>
      <section className="window plated">
        <p className="bar cream">Nothing here</p>
        <p>
          The link may be old, or mistyped. Nothing is broken on your side and nothing was lost.
        </p>
        <div className="btnRow" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => go('/')}>
            Go home
          </button>
          <button className="btn" onClick={() => go('/today')}>
            Today's three
          </button>
        </div>
      </section>
    </>
  );
}
