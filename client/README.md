This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

in the backend folder, i have a nestjs application that has alot of endpoint. you can check the porject plan to have a rough idea of what
it does. Now, in the client folder, i have setup a base nextjs applicatoin. I want to create a front end application that connects to
the nest js application and provides a way for me to view and interact with the backend. Some of the things i want to make sure it has
are.
a home page that explains the product
a business scraping page that has well setup ui that allow the use to be able to scrape for business information, and display the gotten
results in a clean and concise table
a calling page that allow you to enter a buisness or select one from the list of sourced businesses and initiates calles to those
business. the calling page sould show the progress of each call in its own returngalar card, that the user can expand and see the
transcript of the conversiton going on in the call and the ivr decisions made. all this information would be gotten from the backend.
that does all the work
a workflow page that allows you to preview all called business and their verified phone number and the names and the profession of those
people that it found.
