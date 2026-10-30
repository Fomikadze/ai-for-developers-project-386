package ru.hexlet.booking.presentation

import kotlinx.serialization.Serializable

@Serializable
data class HealthResponse(
    val status: String,
)
