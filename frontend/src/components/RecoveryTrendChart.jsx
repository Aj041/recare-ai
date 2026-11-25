import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import EmptyState from './EmptyState.jsx'
import ErrorState from './ErrorState.jsx'
import LoadingState from './LoadingState.jsx'
import { usePatientData } from '../context/usePatientData.js'

function TrendPanel({
  title,
  description,
  data,
  measurementCount,
  dataKey,
  color,
  unit,
  domain,
  ticks,
  dataMode,
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-line p-4 sm:p-5"
    >
      <h3 className="font-semibold text-navy">{title}</h3>
      {measurementCount < 2 ? (
        <div className="mt-4">
          <EmptyState
            description={description}
            title={`Insufficient ${title.toLowerCase()} data`}
          />
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            Reported values only; missing measurements are not plotted as zero.
          </p>
          <figure className="mt-4">
            <figcaption className="sr-only">
              {title} recorded at patient check-ins, oldest to newest.
            </figcaption>
            <div
              aria-label={`${title} over time for the selected ${dataMode} patient`}
              className="h-72 w-full"
              role="img"
            >
              <ResponsiveContainer height="100%" width="100%">
                <LineChart
                  accessibilityLayer
                  data={data}
                  margin={{ top: 10, right: 12, bottom: 40, left: 12 }}
                >
                  <CartesianGrid stroke="#dce5e2" strokeDasharray="4 4" />
                  <XAxis
                    axisLine={false}
                    dataKey="date"
                    height={60}
                    interval="preserveStartEnd"
                    tick={{ fill: '#526571', fontSize: 11 }}
                    tickLine={false}
                    tickMargin={12}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  >
                    <Label
                      position="insideBottom"
                      offset={-24}
                      value="Check-in date"
                      fill="#526571"
                    />
                  </XAxis>
                  <YAxis
                    axisLine={false}
                    domain={domain}
                    ticks={ticks}
                    tick={{ fill: '#526571', fontSize: 11 }}
                    tickLine={false}
                    width={48}
                  >
                    <Label
                      angle={-90}
                      position="insideLeft"
                      style={{ textAnchor: 'middle' }}
                      value={unit}
                      fill="#526571"
                    />
                  </YAxis>
                  <Tooltip
                    formatter={(value) => [`${value} ${unit}`, title]}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Line
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    dataKey={dataKey}
                    dot={{ fill: color, r: 4 }}
                    name={title}
                    stroke={color}
                    strokeWidth={2.5}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </>
      )}
    </section>
  )
}

function RecoveryTrendChart() {
  const {
    dataMode,
    selectedPatient,
    checkIns,
    patientHistoryStatus,
    patientHistoryError,
  } = usePatientData()
  const patientCheckIns = selectedPatient
    ? checkIns
        .filter((checkIn) => checkIn.patient_id === selectedPatient.id)
        .slice()
        .sort(
          (first, second) =>
            new Date(first.submitted_at) - new Date(second.submitted_at),
        )
    : []
  const chartData = patientCheckIns.map((checkIn) => ({
    date: checkIn.submitted_at,
    pain_score:
      typeof checkIn.pain_score === 'number' &&
      Number.isFinite(checkIn.pain_score)
        ? checkIn.pain_score
        : null,
    temperature_c:
      typeof checkIn.temperature_c === 'number' &&
      Number.isFinite(checkIn.temperature_c)
        ? checkIn.temperature_c
        : null,
  }))
  const painCount = chartData.filter((point) => point.pain_score !== null).length
  const temperatureCount = chartData.filter(
    (point) => point.temperature_c !== null,
  ).length

  return (
    <section
      aria-labelledby="recovery-trend-title"
      className="rounded-2xl border border-line bg-white p-6 sm:p-7"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {selectedPatient?.displayName ??
            (dataMode === 'demo' ? 'Synthetic demo' : 'Live patient')}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-navy" id="recovery-trend-title">
          Recovery trends
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Charts show patient-reported measurements only. They do not predict
          health outcomes or provide clinical interpretation.
        </p>
      </div>

      {!selectedPatient ? (
        <EmptyState
          description="Select a patient to view available check-in measurements."
          title="No patient selected"
        />
      ) : patientHistoryStatus === 'loading' ? (
        <LoadingState message="Loading measurements for the selected patient..." />
      ) : patientHistoryStatus === 'error' ? (
        <ErrorState
          description={patientHistoryError}
          title="Live measurements unavailable"
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <TrendPanel
            color="#0f766e"
            dataMode={dataMode}
            data={chartData}
            dataKey="pain_score"
            description="At least two reported pain scores are needed to draw a trend."
            domain={[0, 10]}
            measurementCount={painCount}
            ticks={[0, 2, 4, 6, 8, 10]}
            title="Pain score"
            unit="Score (0-10)"
          />
          <TrendPanel
            color="#153449"
            dataMode={dataMode}
            data={chartData}
            dataKey="temperature_c"
            description="At least two reported temperatures are needed to draw a trend."
            domain={['auto', 'auto']}
            measurementCount={temperatureCount}
            title="Temperature"
            unit="Temperature (Celsius)"
          />
        </div>
      )}
    </section>
  )
}

export default RecoveryTrendChart
