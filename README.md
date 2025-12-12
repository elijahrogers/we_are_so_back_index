### We Are So Back Index

I made this because I thought it was funny. Hopefully you do too. You can see the live index [here](https://wearesobackindex.com). Feel free to contribute.

### Running Locally

This is a very standard Rails 8 app. After cloning it, you can run it locally with:

```bash
bundle install
bundle exec rails db:prepare
bin/dev
```

And in a separate terminal window you can run background jobs with:

```bash
bundle exec rails solid_queue:start
```

### Getting Data

Once the database is set up, you need to ingest historical price data so you have something to look at.

1. **Ingest Historical Prices:**
   Fetch the last 30 days of data for all 500+ symbols:

```bash
bundle exec rails runner "PriceIngestJob.perform_later(range: '30d')"
```

2. **Compute Metrics:**
   Compute the metrics for all dates in the last 30 days:

```bash
bundle exec rails backfill:metric_snapshots[2025-11-21..2025-12-11]
```
