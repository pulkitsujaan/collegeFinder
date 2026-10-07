import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FEE_STEPS = [
  { value: '', label: 'any budget' },
  { value: '100000', label: '₹1 lakh' },
  { value: '200000', label: '₹2 lakh' },
  { value: '500000', label: '₹5 lakh' },
  { value: '1000000', label: '₹10 lakh' },
  { value: '2000000', label: '₹20 lakh' },
];

/**
 * An inline select that sits in the sentence without looking like a form.
 *
 * The visible text is sized by the *selected* option. A bare `<select>` is as
 * wide as its longest `<option>`, so the course slot alone was ~525px wide for
 * eight characters — enough to push the sentence onto a second line. The real
 * select is overlaid invisibly on top, so the native picker, keyboard handling
 * and screen-reader semantics are unchanged.
 */
function Slot({ id, value, onChange, options, ariaLabel }) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <span className="relative inline-flex items-baseline border-b-2 border-dashed border-ink/40 transition-colors focus-within:border-vermilion hover:border-ink">
      <span
        aria-hidden="true"
        className="pr-6 pl-1 font-display whitespace-nowrap tracking-[-0.02em] text-vermilion"
      >
        {selected.label}
      </span>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent opacity-0 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="font-sans text-ink">
            {option.label}
          </option>
        ))}
      </select>

      <span aria-hidden="true" className="pointer-events-none absolute right-1 text-ink-faint">
        ▾
      </span>
    </span>
  );
}

/**
 * The signature interaction: one sentence the student edits, which becomes a
 * filtered listing. Everything here is a native select, so it works with a
 * keyboard, a screen reader and a thumb equally well.
 */
export default function SentenceBuilder({ meta, initialCourse = '', initialCity = '' }) {
  const navigate = useNavigate();
  const [course, setCourse] = useState(initialCourse);
  const [city, setCity] = useState(initialCity);
  const [maxFees, setMaxFees] = useState('');

  const courses = meta?.courses ?? [];
  const cities = meta?.cities ?? [];

  const submit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (course) params.set('course', course);
    if (city) params.set('city', city);
    if (maxFees) params.set('maxFees', maxFees);
    navigate(`/colleges${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor="builder-course" className="sr-only">
        Course
      </label>
      <label htmlFor="builder-city" className="sr-only">
        City
      </label>
      <label htmlFor="builder-fees" className="sr-only">
        Maximum fees
      </label>

      {/*
       * Sized against the viewport so it holds one line inside the 1440px shell
       * from tablet up; not `nowrap`, so a phone — or a 32-character course name
       * like "Bachelor of Business Administration" — wraps instead of scrolling
       * the page sideways.
       */}
      <p className="font-display text-[clamp(1.25rem,2vw,2.1rem)] leading-[1.5] tracking-[-0.02em] text-ink">
        I want to study{' '}
        <Slot
          id="builder-course"
          value={course}
          onChange={setCourse}
          ariaLabel="Course"
          options={[
            { value: '', label: 'anything' },
            ...courses.map((item) => ({ value: item.slug, label: item.name })),
          ]}
        />{' '}
        in{' '}
        <Slot
          id="builder-city"
          value={city}
          onChange={setCity}
          ariaLabel="City"
          options={[
            { value: '', label: 'anywhere' },
            ...cities.map((item) => ({ value: item.value, label: item.label })),
          ]}
        />{' '}
        with fees under{' '}
        <Slot
          id="builder-fees"
          value={maxFees}
          onChange={setMaxFees}
          ariaLabel="Maximum fees"
          options={FEE_STEPS}
        />
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="border border-vermilion bg-vermilion px-7 py-3.5 font-mono text-[0.76rem] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-vermilion-dark active:translate-y-px"
        >
          Show me the colleges
        </button>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-faint">
          {courses.length} courses · {cities.length} cities
        </span>
      </div>
    </form>
  );
}
