# reinecke2013
PSYCH251 replication project 

## Overview
The MTurk experiment runs in the browser using "slides." The user is shown a practice round of 5 images and is then asked to rate the colorfulness of two sets of 30 images. The experiment automatically submits the user data once the user rates the last image. The analysis requires both this worker data as well as the computational image statistics provided by the authors.

## File Structure
* mturk_experiment/index.html: the main landing page for the website
* mturk_experiment/experiment.js: the main functionality for running the experiment
* mturk_experiment/style.css: styling for experiment website
* mturk_experiment/website_stimuli/: folder containing all website images shown to participants
* preprocess.py: cleans the original image stats data from the authors; writes a CSV with just the image statistics and a JSON of excluded images
* postprocess.py: combines the batch CSV from MTurk with the image statistics CSV in long form to prepare for R analysis
* replication_data/: folder to hold intermediate inputs and outputs of replication process
* writeup/: contains the R markdown file for the main write up
* original_data/all.csv: the original data file provided by the authors
* original_paper/: holds the PDF for the original paper


## Pipeline Overview
The full pipeline runs as follows:
1. Fill in paths in preprocess.py for the provided CSV and the stimuli directory.
2. Run preprocess.py to obtain cleaned image stats data.
3. Update paths in postprocess.py to provide paths to the worker and image statistics data.
4. Run postprocess.py to obtain a CSV with one observation per row that combines the image stats and worker data.
5. Conduct analysis in writeup/Leake_Replication_Report.Rmd


