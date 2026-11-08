/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        text: 'rgb(var(--color-foreground) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        info: 'rgb(var(--color-information) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-family-sans)'],
      },
      fontSize: {
        display: 'var(--font-size-display)',
        'heading-1': 'var(--font-size-heading-1)',
        'heading-2': 'var(--font-size-heading-2)',
        'heading-3': 'var(--font-size-heading-3)',
        body: 'var(--font-size-body)',
        caption: 'var(--font-size-caption)',
      },
      fontWeight: {
        regular: 'var(--font-weight-regular)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      lineHeight: {
        heading: 'var(--line-height-heading)',
        body: 'var(--line-height-body)',
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        dialog: 'var(--radius-dialog)',
      },
      boxShadow: {
        'design-sm': 'var(--shadow-sm)',
        'design-md': 'var(--shadow-md)',
        'design-lg': 'var(--shadow-lg)',
      },
      maxWidth: {
        content: 'var(--container-content)',
      },
      zIndex: {
        header: 'var(--z-header)',
        overlay: 'var(--z-overlay)',
      },
    },
  },
  plugins: [],
}
