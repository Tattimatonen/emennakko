import React from 'react';
import axios from 'axios';
import {withStyles} from "@material-ui/core";

import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import Clear from '@material-ui/icons/Clear';

import TrainTable from './TrainTable';

class Trains extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            station: "",
            stationCode: "",
            stations: [],
            arrivals: [],
            departures: [],
            tabValue: 0,
        }
    }

    //haetaan tässä vaiheessa tiedot asemien nimien käsittelyyn
    componentDidMount() {
        axios.get('https://rata.digitraffic.fi/api/v1/metadata/stations')
            .then(response => {
                this.setState({
                    stations: response.data
                });
            });
    }

    handleClickClear = () => {
        this.setState({ station: "", stationCode: "", arrivals: [], departures: [] });
    };

    handleTabChange = (event, tabValue) => {
        this.setState({ tabValue });
    };

    handleStationChange = station => event => {
        this.setState({
            [station]: event.target.value,
            stationCode: this.stationToCode(event.target.value),
        }, () => {
            //haetaan reippaasti junia, koska joukosta tullaan karsimaan useita
            axios.get('https://rata.digitraffic.fi/api/v1/live-trains/station/' + this.state.stationCode + '?arrived_trains=0&arriving_trains=50&departed_trains=0&departing_trains=0&include_nonstopping=false')
                .then(response => {

                    let filtered = response.data.filter(function(train) {
                        //ei rahtijunia, vetureita, vaihtotyötä eikä ratatöitä - oletuksena softa on matkustajille
                        return train.trainCategory !== "Cargo" && train.trainCategory !== "Locomotive" && train.trainCategory !== "Shunting" && train.trainCategory !== "On-track machines";
                    });

                    Trains.sortTrains(filtered, this.state.stationCode, "ARRIVAL");

                    this.setState({
                        arrivals: filtered
                    });
                });

            axios.get('https://rata.digitraffic.fi/api/v1/live-trains/station/' + this.state.stationCode + '?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=50&include_nonstopping=false')
                .then(response => {

                    let filtered = response.data.filter(function(train) {
                        return train.trainCategory !== "Cargo" && train.trainCategory !== "Locomotive" && train.trainCategory !== "Shunting" && train.trainCategory !== "On-track machines";
                    });

                    Trains.sortTrains(filtered, this.state.stationCode, "DEPARTURE");

                    this.setState({
                        departures: filtered
                    });
                });
        });
    };

    //ottaa syötteenä aseman nimen ja palauttaa sen asemakoodin
    stationToCode(station) {
        for (let i = 0; i < this.state.stations.length; i++) {
            if (this.state.stations[i].stationName.split(" asema")[0].toLowerCase() === station.toLowerCase()) {
                return this.state.stations[i].stationShortCode;
            }
        }
    }

    //palauttaa indeksin, jossa juna on tietyllä asemalla sen aikataulutiedoissa
    static getIdx(train, stationCode, type) {
        for (let i = 0; i < train.timeTableRows.length; i++) {
            //matchataan oikea asema (se, joka on hakukentässä)
            if (train.timeTableRows[i].stationShortCode === stationCode && train.timeTableRows[i].type === type) {
                return i;
            }
        }
    }

    //lajitellaan haetut junat uudelleen nousevan saapumis/lähtemisajan määrätylle asemalle perusteella
    static sortTrains(trainArray, stationCode, type) {

        //simppeli bubblesort, vaikka se ei ole tehokas, se riittänee näin pienen junajoukon lajitteluun
        for (let i = 0; i < trainArray.length; i++) {
            for (let j = 0; j < (trainArray.length - i - 1); j++) {
                let indexA = Trains.getIdx(trainArray[j], stationCode, type);
                let indexB = Trains.getIdx(trainArray[j+1], stationCode, type);

                let trainTimeA = trainArray[j].timeTableRows[indexA].scheduledTime;
                let trainTimeB = trainArray[j+1].timeTableRows[indexB].scheduledTime;

                if (trainTimeA > trainTimeB) {
                    let tmp = trainArray[j];
                    trainArray[j] = trainArray[j+1];
                    trainArray[j+1] = tmp;
                }
            }
        }

        return trainArray;
    }

    render() {
        const {classes} = this.props;
        const {tabValue} = this.state;

        return(
            <div>
                <div>
                    <p className={classes.text}>
                        <b>Hae aseman nimellä</b>
                    </p>
                    <form noValidate autoComplete="off">
                        <TextField
                            id="search"
                            className={classes.search}
                            value={this.state.station}
                            onChange={this.handleStationChange('station')}
                            margin="dense"
                            variant="outlined"
                            InputProps={{
                                classes: {
                                root: classes.searchFocused,
                                focused: classes.focused,
                                notchedOutline: classes.outlined,
                                },
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={this.handleClickClear}
                                            className={classes.clear}
                                        >
                                            <Clear/>
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </form>
                </div>

                <div className={classes.root}>
                    <Tabs
                        value={tabValue}
                        onChange={this.handleTabChange}
                        classes={{root: classes.tabsRoot, indicator: classes.tabsIndicator}}
                    >
                        <Tab
                            label="Saapuvat"
                            disableRipple
                            classes={{root: classes.tabRoot, selected: classes.tabSelected}}
                        />
                        <Tab
                            label="Lähtevät"
                            disableRipple
                            classes={{root: classes.tabRoot, selected: classes.tabSelected}}
                        />
                    </Tabs>
                </div>

                {tabValue === 0 && <TabContainer>
                    <TrainTable
                        trainArray={this.state.arrivals}
                        stations={this.state.stations}
                        stationCode={this.state.stationCode}
                        type={"ARRIVAL"}
                    />
                </TabContainer>}

                {tabValue === 1 && <TabContainer>
                    <TrainTable
                        trainArray={this.state.departures}
                        stations={this.state.stations}
                        stationCode={this.state.stationCode}
                        type={"DEPARTURE"}
                    />
                </TabContainer>}

            </div>
        )
    }
}

const styles = () => ({
    text: {
        margin: 20,
        marginBottom: 0,
    },
    search: {
        marginLeft: 20,
        marginBottom: 40,
        backgroundColor: '#f3f3f3',
    },
    focused: {},
    outlined: {},
    searchFocused: {
        '&$focused $outlined': {
            borderColor: '#000000',
            borderWidth: 1,
        },
    },
    root: {
        flexGrow: 1,
    },
    clear: {
        marginRight: 0,
    },
    tabsRoot: {
        borderBottom: '1px solid #e8e8e8',
        //tähän aukko aktiivisen tabin kohdalle?
    },
    tabsIndicator: {
        backgroundColor: '#000000',
    },
    tabRoot: {
        textTransform: 'initial',
        minWidth: 72,
        color: '#35852a',
        '&:nth-of-type(odd)': {
            marginLeft: 20,
        },
        '&:hover': {
            color: '#000000',
            opacity: 1,
        },
        '&$tabSelected': {
            color: '#000000',
            borderTop: '1px solid #e8e8e8',
            borderLeft: '1px solid #e8e8e8',
            borderRight: '1px solid #e8e8e8',
            borderRadius: '10px 10px 0px 0px',
        },
        '&:focus': {
            color: '#000000',
            opacity: 1,
        },
    },
    tabSelected: {},
});

function TabContainer(props) {
    return (
        <div>
            {props.children}
        </div>
    );
}

export default withStyles(styles)(Trains);