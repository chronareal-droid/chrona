# Legal review: state deposit rules

`lib/deposit-laws.ts` was compiled from general knowledge of each state's security deposit statute. The legal
research sites were not reachable when it was written, so **no entry has been verified against current statute
text**. Every entry has `verified: false`, and the app tells renters the rule is "pending review."

Each entry drives what renters see and what their letter says, so verify before launch:

- [ ] `returnDays` and `deadlineNote`: the deadline, and what starts the clock (move-out, lease end,
      forwarding address, written demand). Set `clockStartsOnForwardingAddress` where it applies (only TX is set today).
- [ ] `multiplier`, `penaltyBase`, `flatPenalty`: what a tenant can recover and whether it's a multiple of the
      deposit or of the amount withheld. Several states give "up to" amounts or require bad faith.
- [ ] `penaltySummary`: plain-English wording printed in the letter.
- [ ] `statute`: the current citation.
- [ ] Local rules: cities like Chicago, NYC, Seattle, LA and Boston have stricter ordinances not modeled here.

Lower-confidence entries to check first: IA, KY, MT, NE, NM, SD, TN, UT, WV, WY, IL, CT, WA.

When an entry is verified, set `verified: true` and note the source and date in the commit message.
