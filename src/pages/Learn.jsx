// ---------------------------------------------------------------------------
// Learn.jsx — a safe practice page for learning React.
//
// Everything on this page is SELF-CONTAINED. It keeps its own little list of
// three pretend tasks in its own state. It never touches your real tasks,
// never talks to TaskContext, and never saves anything. Refresh the page and
// it starts over. Break it, edit it, experiment — nothing real can be lost.
//
// It demonstrates the three ideas that make up every React app:
//
//   COMPONENT  a function that returns what to draw        (LearnTaskRow)
//   PROPS      the values a parent hands to a child        (task, onToggle)
//   STATE      data that, when changed, redraws the screen (practiceTasks)
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Button from '../components/Button.jsx';

// The three practice tasks we start with.
// This is a plain constant, NOT state — it never changes. It is only the
// starting point we copy into state below (and copy again when you reset).
const LEARN_SEED = [
  { id: 1, title: 'Read about components', done: true },
  { id: 2, title: 'Understand props', done: false },
  { id: 3, title: 'Try changing state', done: false },
];

// ---------------------------------------------------------------------------
// THE CHILD COMPONENT
//
// Look at what this function receives: { task, onToggle }. Those are PROPS.
//
// Notice what it does NOT have:
//   - no useState        → it remembers nothing of its own
//   - no idea what a "real" task is
//   - no way to change the list it came from
//
// It only knows how to DRAW one row, and who to CALL when clicked. That is
// what people mean by a "dumb" or "presentational" component, and it is a
// good thing: there is almost nowhere for a bug to hide in here.
// ---------------------------------------------------------------------------
function LearnTaskRow({ task, onToggle }) {
  return (
    <div className={`learn-row ${task.done ? 'is-done' : ''}`}>
      {/*
        `onToggle` is a PROP THAT IS A FUNCTION. This is how a child talks
        back to its parent. The child does not know (and does not care) what
        happens next — it just reports "this id was clicked".

        Data flows DOWN as props.  Events flow UP as function calls.
      */}
      <button
        className={`check-circle ${task.done ? 'checked' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      >
        {task.done && <Icon name="check" size={12} />}
      </button>

      {/* Curly braces mean "put the value of this JavaScript here". */}
      <span className="learn-row-title">{task.title}</span>

      <span className="learn-row-state">{task.done ? 'done' : 'to do'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// THE PARENT COMPONENT
//
// This one owns the STATE. It is the single place the list of practice tasks
// lives, and therefore the only place that can change it.
// ---------------------------------------------------------------------------
export default function Learn() {
  // useState hands back exactly two things:
  //   practiceTasks     the value right now — read it as much as you like
  //   setPracticeTasks  the ONLY way to change it, and it also redraws
  //
  // Writing `practiceTasks = somethingElse` would be silently broken: the
  // value would change but React would never repaint. Always use the setter.
  const [practiceTasks, setPracticeTasks] = useState(LEARN_SEED);

  // A separate piece of state, just to prove a component can have several.
  const [clicks, setClicks] = useState(0);

  // This is the function we pass DOWN to each row as the `onToggle` prop.
  function handleToggle(id) {
    setClicks((n) => n + 1);

    // IMPORTANT: we build a BRAND NEW array instead of editing the old one.
    //
    // React decides whether to redraw by asking "is this the same array as
    // before?" — not by inspecting every item inside it. If we changed the
    // existing array in place, it would still be the same array, so React
    // would see no change and the screen would not update.
    //
    // .map() returns a new array for us. For the row we clicked we return a
    // new object with `done` flipped; every other row is passed through
    // untouched.
    setPracticeTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  }

  // Plain variables, recalculated on every redraw. They do NOT need to be
  // state: they can always be worked out from state we already have.
  // A good rule: if you can calculate it, don't store it.
  const doneCount = practiceTasks.filter((task) => task.done).length;
  const allDone = doneCount === practiceTasks.length;

  return (
    <div className="page">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Try it</h2>
          <span className="panel-meta">Practice only — your real tasks are untouched</span>
        </div>

        <p className="learn-intro">
          Click a circle to mark a practice task complete. Watch the counter,
          the label and the progress line all update together — you only
          changed one thing, but React redrew everything that depends on it.
        </p>

        {/*
          Here is where PROPS are handed over. Each row gets:
            task      the data to draw
            onToggle  the function to call when clicked

          `key` is special: React uses it to tell list items apart between
          redraws. It is not a prop — LearnTaskRow never receives it.
        */}
        <div className="learn-list">
          {practiceTasks.map((task) => (
            <LearnTaskRow key={task.id} task={task} onToggle={handleToggle} />
          ))}
        </div>

        <div className="learn-summary">
          <div>
            <p className="learn-count">{doneCount} of {practiceTasks.length} done</p>
            <p className="learn-hint">
              {allDone
                ? 'All three complete. Now press Reset and watch state go back.'
                : 'This number is not stored anywhere — it is counted fresh on every redraw.'}
            </p>
          </div>

          <div className="learn-summary-right">
            <p className="learn-clicks">{clicks} {clicks === 1 ? 'click' : 'clicks'}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setPracticeTasks(LEARN_SEED); setClicks(0); }}
            >
              Reset
            </Button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">What happened when you clicked</h2>
        </div>

        <ol className="learn-steps">
          <li><strong>You clicked</strong> the circle inside <code>LearnTaskRow</code>.</li>
          <li><strong>The child called its prop:</strong> <code>onToggle(task.id)</code>. It had no idea what that function does.</li>
          <li><strong>The parent ran</strong> <code>handleToggle</code>, building a new array with one task flipped.</li>
          <li><strong>State changed</strong> via <code>setPracticeTasks</code> — this is what tells React to redraw.</li>
          <li><strong>React redrew</strong> the parent, which passed fresh props down, and every row updated.</li>
        </ol>

        <p className="learn-note">
          Your real app does exactly this. The circle on a task card calls
          <code> onToggle(task.id)</code>, which reaches <code>toggleComplete</code>
          in <code>TaskContext</code>, which flips the status and saves it. Same
          three ideas — just with real data and a real place to store it.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Things to try</h2>
        </div>

        <p className="learn-note">
          Open <code>src/pages/Learn.jsx</code> and change something, then run
          <code> sh build-standalone.sh</code> and refresh.
        </p>

        <ul className="learn-try">
          <li>Add a fourth task to <code>LEARN_SEED</code>. The counter adjusts by itself — you did not have to tell it.</li>
          <li>In <code>LearnTaskRow</code>, show <code>{'{task.id}'}</code> next to the title. Proof that props are just values you read.</li>
          <li><strong>Break it on purpose:</strong> replace <code>setClicks(n =&gt; n + 1)</code> with <code>clicks + 1</code> and watch the count go wrong. Then put it back.</li>
          <li>Give <code>LearnTaskRow</code> its own <code>useState</code> and see that each row now remembers separately — state belongs to one component.</li>
        </ul>
      </section>
    </div>
  );
}
