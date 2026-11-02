package ru.hexlet.booking.presentation

import kotlinx.serialization.Serializable

@Serializable
data class SlotResponse(
    val start: String,
    val end: String,
)
