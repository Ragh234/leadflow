def test_health_returns_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_route_uses_the_detail_error_shape(client):
    response = client.get("/api/nope")

    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


def test_cors_allows_the_configured_frontend_origin(client):
    response = client.options(
        "/api/health",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
