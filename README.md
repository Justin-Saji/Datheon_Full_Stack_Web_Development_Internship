Task 1 : Personal Developer Portfolio Website
# Justin Saji — Developer Portfolio

A fast, responsive, accessible portfolio built with plain **HTML5, CSS3 and JavaScript (ES6+)**. No build step, no dependencies.

**Live site:** https://justin-saji.github.io/Portfolio_Website/

## Features

- Semantic HTML5: header, hero, about, skills grid, experience timeline, featured projects, contact
- Mobile-first layout using Flexbox and CSS Grid
- Dark / light theme toggle (remembers your choice, respects system preference)
- Smooth scrolling, active-section nav highlighting and scroll-reveal animations
- Mobile hamburger menu
- Project modal popups (keyboard accessible, closes with Esc)
- Downloadable resume (`assets/Justin_Saji_Resume.pdf`)
- Respects `prefers-reduced-motion`

## Project structure

```
Portfolio_Website/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/
    └── Justin_Saji_Resume.pdf
```

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Customise

Project cards and modal content live in the `projects` array at the top of `script.js`.
Replace any `// TODO` link with the exact GitHub repo URL.

## Deploy

**GitHub Pages:** repo → Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `(root)` → Save.

**Netlify / Vercel:** import the repo, leave the build command empty and the output directory as the root.

## Contact

justinsaji2412@gmail.com · [LinkedIn](https://linkedin.com/in/justin-saji) · [GitHub](https://github.com/Justin-Saji)



Task 2: E-Commerce Storefront

A small online store that loads products from FakeStoreAPI, with a working cart and a fake checkout. Prices are converted from USD to Indian rupees.

Storefront screenshot

What it does:

Product cards with image, category, star rating, review count and price
Badges for top rated items, best sellers and cheap deals
Category buttons for Electronics, Jewelry and Clothing, plus a search box and a sort dropdown
A cart drawer that slides in from the right, with a counter on the navbar
Add, remove and change quantity from inside the cart
Subtotal, tax, shipping and total, recalculated on every change
The cart is saved in localStorage, so it is still there after a refresh
A checkout modal with a form, followed by an order confirmation and a generated order ID
A CSS Grid product layout that works on phones, tablets and desktops

Files:

ecommerce-storefront/
├── index.html
├── style.css
└── script.js

How the code is organised:

The product list, the cart and the current filter, search and sort values are kept in plain JavaScript variables. Whenever one of them changes, the page is re-rendered. The main functions are addToCart(), removeFromCart(), updateQuantity() and calculateTotal().

The cart only stores a product ID and a quantity. Prices are looked up from the product list each time, so the totals can't drift out of sync with the catalogue.

Settings at the top of script.js:

Constant	Value	Meaning
USD_TO_INR	95	Rough exchange rate used to convert the API prices
TAX_RATE	0.08	Tax added to the subtotal
SHIPPING_FLAT	99	Shipping fee in rupees
FREE_SHIPPING_OVER	5000	Orders above this amount ship free
DEAL_UNDER	1900	Items below this price get the deal badge

Running it: open the folder in VS Code, install the Live Server extension, right-click ecommerce-storefront/index.html and choose Open with Live Server. You need an internet connection, since the products come from the API.

Things to know:

Checkout is only a simulation. Nothing is charged and no order is sent anywhere.
The exchange rate is fixed by hand, so it won't match the live rate exactly.
FakeStoreAPI is a demo service, so the products and images are test data.
Running any task
bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
code .

Then open the task's index.html with Live Server. Opening the file directly in a browser also works for most things, but Live Server avoids odd issues with API requests.

What I learned
Keeping one source of truth for data (the cart holds IDs, not copies of products) saves a lot of bugs
Event delegation is much easier than attaching listeners to every button after each render
localStorage can be empty or corrupted, so reading from it needs a try/catch
Designing for a phone-sized screen first makes the desktop version easier
