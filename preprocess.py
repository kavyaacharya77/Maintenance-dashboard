import csv, json, statistics

# Load the CSV
data = list(csv.DictReader(open('data/ai4i2020.csv', encoding='utf-8-sig')))

# Count each failure type
modes = ['TWF', 'HDF', 'PWF', 'OSF', 'RNF']
failure_modes = {m: sum(1 for r in data if r[m] == '1') for m in modes}

# Count machines and failures per product type (L, M, H)
from collections import Counter
all_by_type  = Counter(r['Type'] for r in data)
fail_by_type = Counter(r['Type'] for r in data if r['Machine failure'] == '1')

# Group machines into tool wear buckets: 0-50, 50-100, 100-150, 150-200, 200+
buckets      = [0] * 5
fail_buckets = [0] * 5
for r in data:
    idx = min(int(float(r['Tool wear [min]']) // 50), 4)
    buckets[idx] += 1
    fail_buckets[idx] += int(r['Machine failure'])

# Pick every 20th row for scatter plots (500 points total)
step = len(data) // 500
scatter = []
for r in data[::step][:500]:
    scatter.append({
        'rpm':      float(r['Rotational speed [rpm]']),
        'torque':   float(r['Torque [Nm]']),
        'toolWear': float(r['Tool wear [min]']),
        'airTemp':  float(r['Air temperature [K]']),
        'procTemp': float(r['Process temperature [K]']),
        'failure':  int(r['Machine failure']),
        'type':     r['Type']
    })

# Bundle everything into one JSON file
rpms = [float(r['Rotational speed [rpm]']) for r in data]
wear = [float(r['Tool wear [min]']) for r in data]

output = {
    'totalRecords':       len(data),
    'totalFailures':      sum(1 for r in data if r['Machine failure'] == '1'),
    'avgToolWear':        round(statistics.mean(wear), 1),
    'maxToolWear':        max(wear),
    'avgRPM':             round(statistics.mean(rpms), 1),
    'failureModes':       failure_modes,
    'allByType':          dict(all_by_type),
    'failByType':         dict(fail_by_type),
    'toolWearBuckets':    buckets,
    'toolWearFailBuckets':fail_buckets,
    'scatter':            scatter
}

with open('data/dashboard.json', 'w') as f:
    json.dump(output, f)

print("Done! data/dashboard.json has been created.")