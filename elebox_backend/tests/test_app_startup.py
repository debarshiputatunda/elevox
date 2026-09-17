def test_application_routes_can_be_loaded():
    # Importing the app registers upload routes and checks their runtime
    # dependencies, without starting pollers or connecting to real devices.
    from app.main import app

    assert '/imports/locations' in app.openapi()['paths']
