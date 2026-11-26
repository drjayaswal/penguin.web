import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'media',
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', fg: 'var(--fg)', paper: '#faf9f6', ink: '#242424',
        action: '#202124', 'action-hover': '#34363b', nav: '#57585c', 'nav-active': '#222127',
        muted: '#666', 'muted-light': '#777', 'footer-link': '#898989', 'footer-note': '#888',
        'card-copy': '#706a76', 'signin-error': '#a43b4b', 'repo-copy': '#626262', 'repo-detail': '#686868',
        'repo-gold': '#e8d28e', 'repo-green': '#cbd7ce', 'repo-gray': '#d5d5d2',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
        editorial: ['Georgia', 'serif'],
        rounded: ['ui-rounded', 'SF Pro Rounded', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '15': '15px', '17': '17px', '19': '19px', '22': '22px', '23': '23px', '28': '28px', '30': '30px', '34': '34px', '38': '38px', '52': '52px', '65': '65px',
        'hero-tagline': ['clamp(25px, 3vw, 44px)', '1.2'],
        wordmark: ['clamp(64px, 13vw, 180px)', '1'],
        'feature-heading': ['clamp(46px, 5vw, 72px)', '.99'],
        'footer-heading': ['clamp(34px, 4vw, 56px)', '1.2'],
        'repos-heading': ['clamp(46px, 7.4vw, 106px)', '.98'],
        'updates-heading': ['clamp(52px, 7vw, 92px)', '1.05'],
      },
      spacing: {
        '3.75': '15px', '15': '60px', '30': '120px', '1.75': '7px', '2.25': '9px', '2.75': '11px', '3.25': '13px', '4.25': '17px',
        '4.5': '18px', '4.75': '19px', '5.5': '22px', '5.75': '23px', '6.25': '25px',
        '7.5': '30px', '8.5': '34px', '8.75': '35px', '9.5': '38px', '10.5': '42px',
        '13': '52px', '13.75': '55px', '16.25': '65px', '17.5': '70px', '18.75': '75px',
        '22.5': '90px', '25': '100px', '29.5': '118px', '31.25': '125px', '32.5': '130px', '36.25': '145px',
      },
      width: { footer: 'min(1200px,82%)', security: 'min(1050px,86%)', repos: 'min(1300px,88%)', updates: 'min(920px,86%)', curve: '130%' },
      maxWidth: { features: '1440px', 'card-copy': '300px' },
      minWidth: { connect: '250px', 'footer-column': '40%' },
      minHeight: { 'home-scroll': '200vh', feature: '280px', 'feature-mobile': '230px' },
      height: { curve: '500px', 'repo-art': '260px' },
      inset: { curve: '-15%' },
      padding: { page: '7%', 'page-mobile': '6%' },
      opacity: { '94': '.94' },
      borderRadius: { 'home-mobile': '28px', 'home': '48px', nav: '17px', action: '25px', card: '30px', art: '18px', curve: '50%' },
      letterSpacing: { display: '-.045em', title: '-.04em', word: '-.05em', repos: '-.055em', subtitle: '-.035em', action: '-.015em' },
      lineHeight: { intro: '1.4', copy: '1.6', security: '1.65', editorial: '1.7', normalfont: 'normal' },
      fontWeight: { mediumplus: '550' },
      boxShadow: { nav: '0 2px 10px #00000012', action: '0 4px 12px #00000015', 'action-hover': '0 6px 18px #00000020', curve: '0 -9px 25px #322a1810' },
      gridTemplateColumns: { security: '280px 1fr', update: '180px 1fr' },
      backgroundImage: { home: "url('/blue.png')" },
    },
  },
  plugins: [],
}
export default config
