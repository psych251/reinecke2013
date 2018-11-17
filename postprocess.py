import csv
import os
import shutil
import sys
import json
import argparse

"""
Creates a csv with one row per observation that merges the image stats and worker data

default usage: python postprocess.py
"""

WORKER_HEADERS = ["workerNum", "retake", "gender", "age", "country", "years", "residence", "education", "vision", "websiteName", "trialNum", "image_type", "score", "score2"]

#TEST_WORKER_DATA = "./replication_data/Batch_213376_batch_results.csv"
#TEST_WORKER_DATA = "./replication_data/Batch_213478_batch_results.csv"
#TEST_WORKER_DATA = "./replication_data/Batch_213613_batch_results.csv"
TEST_WORKER_DATA = "./replication_data/Batch_214076_batch_results.csv"
IMAGE_STATS_DATA = "./replication_data/subset.csv"
OUT_PATH = "./replication_data/Batch_214076_batch_out.csv"

def write_csv(data, out_filepath):
    """utils function to write data to CSV file"""
    with open(out_filepath, 'wb') as csvfile:
       writer = csv.writer(csvfile, delimiter=',')
       for row in data:
            writer.writerow(row)
       print "done writing " +out_filepath

def load_worker_csv(batch_csv):
    """loads the MTurk batch CSV and returns an array with the data for each worker"""
    with open(batch_csv, 'rb') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        headers = next(reader, None)
        data_index = headers.index("Answer.data")
        data_per_worker = []
        for row in reader:
            data_per_worker.append(row[data_index])
        return data_per_worker

def load_image_stats_csv(image_stats_csv):
    """loads the images stats CSV data for each website and returns a dict mapping website name to data 
    and an array of headers"""
    with open(image_stats_csv, 'rb') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        image_stats_headers = next(reader, None)[1:] #ignore index 0, which is the website name
        image_data_per_website = {}
        for row in reader:
            website = row[0]
            image_data_per_website[website] = row[1:]
        return image_data_per_website, image_stats_headers

def update_image_name(image_path_string):
    """removes the path to the image and returns the name using the convention from 
    Reinecke: ex. graycale_8.png"""
    curr_dir, web_stimuli, image_type, img_name = image_path_string.split(os.sep)
    image_num = img_name.split(".png")[0]
    new_name = image_type+"_"+image_num
    return new_name

def get_image_name(image_name):
    """gives the image type based on its name"""
    if "english" in image_name:
        return "english"
    elif "foreign" in image_name:
        return "foreign"
    elif "grayscale" in image_name:
        return "grayscale"
    elif "practice" in image_name:
        return "practice"
    else:
        sys.exit("unknown image type")

def get_base_row_per_worker_website(worker_data):
    """gets the demographic data for each worker and returns an array for each worker"""
    base_rows = []
    for idx, worker in enumerate(worker_data): #loop through each worker's data array
        json_data = json.loads(worker_data[idx])["data"]
        for i, d in enumerate(json_data):
            base_row = range(len(WORKER_HEADERS))
            base_row[0] = idx
            if "demographics" in d.keys():
                data = json.loads(d["demographics"])
                for item in data:
                    print item.keys()
                    name = item[u'name']
                    value = item[u'value']
                    if name == "retake":
                        print 'here'
                        base_row[1] = value
                    elif name == "gender":
                        base_row[2] = value
                    elif name == "age":
                        base_row[3] = value
                    elif name == "country0":
                        base_row[4] = value
                    elif name == "years0":
                        base_row[5] = value
                    elif name == "residence":
                        base_row[6] = value
                    elif name == "education":
                        base_row[7] = value
                    elif name == "vision":
                        base_row[8] = value
                base_rows.append(base_row)
    return base_rows

def fill_worker_data_per_website(worker_data, base_rows):
    """performs merging of image stats and worker data to create a data array with one observation per row"""
    out_data = [WORKER_HEADERS]
    for idx, worker in enumerate(worker_data): #loop through each worker's data array
        json_data = json.loads(worker_data[idx])["data"]
        seen_websites = {}
        for i, d in enumerate(json_data):
            if "demographics" not in d.keys():
                new_row = range(13)
                new_row[0:9] = base_rows[idx][0:9]
                if u'score' in d.keys():
                    image_name = update_image_name(d[u'imagePath'])
                    if image_name in seen_websites.keys(): #map website name to row num
                        out_data[seen_websites[image_name]].append(d[u'score'])
                    else:
                        new_row[9] = image_name
                        new_row[10] = d[u'currentTrialNum']
                        new_row[11] = get_image_name(image_name)
                        new_row[12] = d[u'score']
                        seen_websites[image_name] = len(out_data)
                        out_data.append(new_row)
               
    print seen_websites
    print out_data
    print len(out_data)
    return out_data

def add_website_stats(demographic_and_score_data, image_stats_dict, image_stats_headers):
    """adds the website stats to the user data"""
    header = demographic_and_score_data[0]
    header.extend(image_stats_headers)
    out_data = [header]
    image_name_index = header.index("websiteName")
    for row in demographic_and_score_data[1:]:
        image_name = row[image_name_index]
        if image_name in image_stats_dict.keys():
            image_stats = image_stats_dict[image_name]
            row.extend(image_stats)
        out_data.append(row)
    return out_data


if __name__ == "__main__": 
    parser = argparse.ArgumentParser(description='Specify in and out filepaths to convert CSV files')
    parser.add_argument("-i", "--image_data", dest="image_data", type=str,
                        help='give input image csv filepath', default=IMAGE_STATS_DATA)
    parser.add_argument("-w", "--worker_data", dest="worker_data", type=str,
                        help='give input worker csv filepath', default=TEST_WORKER_DATA)
    parser.add_argument("-o", "--out_csv", dest="out_csv", type=str,
                        help='give output csv filepath', default=OUT_PATH)
    args = parser.parse_args()

    #merge the collected user data and the computational image stats
    #step 1: load the worker data
    worker_data = load_worker_csv(args.worker_data)
    #step 2: get the demographic data per worker
    demographic_data_per_worker = get_base_row_per_worker_website(worker_data)
    #step 3: merge the demographic data with the score per website
    merged_demographic_score_data = fill_worker_data_per_website(worker_data, demographic_data_per_worker)
    #step 4: load the computational image_stats
    image_stats_dict, image_stats_headers = load_image_stats_csv(args.image_data)
    #step 5: finally merge the stats and user data with one row per observation
    out_data = add_website_stats(merged_demographic_score_data, image_stats_dict, image_stats_headers)
    #step 6: write the combined data CSV file
    write_csv(out_data, args.out_csv)



